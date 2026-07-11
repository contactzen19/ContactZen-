#!/usr/bin/env python3
"""run_audit.py — the one command. Phase 1 / M1: ingest + email verify.

USAGE (from ContactZen/audit_runner):
    python3 run_audit.py --client elaine --list ~/Downloads/july_list.csv --dry
    python3 run_audit.py --client elaine --list ~/Downloads/july_list.csv

--dry shows the full cost preview and spends nothing. Without it, the runner
still shows the preview and asks once before spending the first credit.
Multiple --list flags merge into one audit. Re-running after a crash resumes
from the checkpoint; already-verified emails are never re-spent.

Phone + DNC (M2) needs the client's SAN three-piece filled in client.yaml
and the RPV account switched to that SAN. --skip-phone runs email-only.
--mock-phone runs the phone step with FAKE lookups (testing only; outputs
are suffixed _MOCK and never delivered).

After verification, analyze + roadmap run automatically (offline, free):
the audit summary, the evidence CSV, and the Priority Call List xlsx.

Coming next: M4 report draft, M5 --monthly delta mode.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date, datetime

import analyze
import build_roadmap
import clientcfg
import ingest
import verify_email
import verify_phone


def main() -> None:
    ap = argparse.ArgumentParser(description="ReachAudit internal audit runner (Phase 1, M1)")
    ap.add_argument("--client", required=True, help="client short name, e.g. elaine")
    ap.add_argument("--list", required=True, action="append", dest="lists",
                    help="path to the customer's CSV/XLSX (repeat for multiple lists)")
    ap.add_argument("--dry", action="store_true", help="cost preview only, spend nothing")
    ap.add_argument("--yes", action="store_true", help="accept column guesses and cost without prompting")
    ap.add_argument("--stamp", default=None, help="run folder name (default: current YYYY-MM)")
    ap.add_argument("--skip-phone", action="store_true", help="email verification only")
    ap.add_argument("--mock-phone", action="store_true",
                    help="TESTING ONLY: fake phone lookups, no token or credits, outputs suffixed _MOCK")
    args = ap.parse_args()

    cfg = clientcfg.load(args.client)
    if cfg is None:
        if args.yes:
            sys.exit(f"Unknown client '{args.client}'. Run once without --yes to set them up.")
        cfg = clientcfg.create_interactive(args.client)

    stamp = args.stamp or date.today().strftime("%Y-%m")
    paths = clientcfg.run_dir(args.client, stamp)
    print(f"\n=== ReachAudit runner · {cfg.get('display_name', args.client)} · {stamp} ===")

    # 1. Ingest ------------------------------------------------------------
    stats = ingest.run(args.lists, paths, cfg, assume_yes=args.yes)
    clientcfg.save(args.client, cfg)  # persist any newly learned column mapping
    n_steps = 2 if args.skip_phone else 3
    print(f"\n[1/{n_steps}] Ingest: {stats['raw_rows']} rows in {stats['files']} file(s) "
          f"-> {stats['contacts']} contacts ({stats['dupes_removed']} dupes removed)")
    print(f"       with email: {stats['with_email']} · with 10-digit phone: {stats['with_phone']}")

    # 2. Email verify (cost gate first) -------------------------------------
    import pandas as pd
    master = pd.read_csv(stats["master"], dtype=str).fillna("")
    emails = [e for e in master["_email"].tolist() if e]

    p = verify_email.plan(emails, paths["work"])
    print(f"\n[2/{n_steps}] Email verify plan: {p['total']} unique emails · "
          f"{p['done']} already checkpointed · {len(p['todo'])} to verify "
          f"(= {len(p['todo'])} ZB credits)")

    # Phone plan is part of the cost preview even in --dry.
    pp = None
    if not args.skip_phone:
        pp = verify_phone.plan(master, paths["work"])
        print(f"\n[3/{n_steps}] Phone+DNC plan: {pp['callable_contacts']} callable contacts · "
              f"{pp['unique_phones']} unique phones · {pp['done']} already done · "
              f"{pp['todo']} to look up (~${pp['est_cost']:.2f} RPV)")

    balance = None
    try:
        key = verify_email.load_key()
        balance = verify_email.get_credits(key)
        print(f"       ZeroBounce balance: {balance} credits")
        if balance is not None and balance < len(p["todo"]):
            print(f"       WARNING: balance {balance} < {len(p['todo'])} needed. "
                  "Top up and re-run; the checkpoint resumes where it left off.")
    except SystemExit:
        raise
    except Exception as e:
        print(f"       (could not check credit balance: {e})")

    if args.dry:
        print("\nDry run. Nothing verified, no credits spent. Re-run without --dry to start.")
        return

    if (p["todo"] or (pp and pp["todo"])) and not args.yes:
        pieces = []
        if p["todo"]:
            pieces.append(f"{len(p['todo'])} ZB credits")
        if pp and pp["todo"]:
            pieces.append(f"~${pp['est_cost']:.2f} in RPV lookups" + (" (MOCK, free)" if args.mock_phone else ""))
        ans = input(f"\nSpend {' + '.join(pieces)} now? [y/N] ").strip().lower()
        if ans != "y":
            print("Stopped. Nothing spent.")
            return

    result = {"statuses": {}, "results": None, "verified_this_run": 0}
    if emails:
        result = verify_email.run(emails, paths["work"], verify_email.load_key())
        print(f"\nVerified {result['verified_this_run']} emails this run.")
        for status, n in sorted(result["statuses"].items()):
            print(f"    {status:12} {n}")

    phone_result = None
    if not args.skip_phone:
        print("\nPhone + DNC pass..." + (" [MOCK — fake data, testing only]" if args.mock_phone else ""))
        phone_result = verify_phone.run(master, paths, cfg, args.client,
                                        assume_yes=args.yes, mock=args.mock_phone)
        clientcfg.save(args.client, cfg)  # persist test-passed flag + rescrub dates
        for verdict, n in sorted(phone_result["counts"].items()):
            print(f"    {verdict:24} {n}")
        if phone_result["compliance_record"]:
            print(f"    Compliance record -> {phone_result['compliance_record']}")
            print(f"    Next rescrub due: {cfg.get('next_rescrub')}")

    # Analyze + roadmap (offline, no spend) ---------------------------------
    print("\nAnalyzing..." + (" [MOCK]" if args.mock_phone else ""))
    a = analyze.run(paths, cfg, mock=args.mock_phone)
    r = build_roadmap.run(a["frame"], paths, cfg, mock=args.mock_phone)
    print(f"\nTiers: {r['tiers']}")
    print(f"Evidence CSV:  {a['evidence']}")
    print(f"Roadmap xlsx:  {r['roadmap']}")

    # Run summary for the folder (and later, the monthly delta). ------------
    summary = {
        "client": args.client,
        "stamp": stamp,
        "ran_at": datetime.now().isoformat(timespec="seconds"),
        "ingest": {k: v for k, v in stats.items() if k != "master"},
        "email_verify": {"statuses": result["statuses"], "results_csv": result["results"]},
        "phone_verify": (
            {k: v for k, v in phone_result.items() if k != "enriched"} if phone_result else None
        ),
        "verdicts": a["verdicts"],
        "tiers": r["tiers"],
        "dnc": a["dnc"],
        "mock_phone": bool(args.mock_phone),
        "zb_balance_before": balance,
    }
    with open(f"{paths['base']}/run_summary.json", "w") as f:
        json.dump(summary, f, indent=2)

    print(f"\nDone. Deliverables in {paths['deliver']}" +
          (" (MOCK outputs stayed in work/)" if args.mock_phone else ""))
    print("Next (not built yet): M4 report draft -> M5 --monthly.")


if __name__ == "__main__":
    main()
