"""verify_phone.py — module 3 of the audit runner (M2).

Wraps phone_dnc_identity.py (the existing, working DNC engine — this file
adds orchestration, never re-implements lookups). What the wrapper adds:

1. SAN gate. RPV has no per-request SAN parameter; the SAN lives in the RPV
   account settings. So per-client safety means: client.yaml must hold the
   full SAN three-piece (never guessed), the expiration must not be past,
   and Joey confirms the RPV account is currently set to THIS client's SAN
   before a single paid lookup fires.
2. First-run test batch. A client's first-ever live phone run does 10
   numbers first, shows the verdicts, and asks whether the SAN wiring looks
   right before spending on the rest (playbook stage 4).
3. Resume. Phones already looked up successfully in this run folder are
   never paid for twice.
4. Dedupe. Each unique 10-digit phone is looked up once, then merged back
   onto every contact that carries it.

Outputs in work/: phone_results.csv (per unique phone) and
master_enriched.csv (master + phone columns). The compliance-record JSON is
copied to deliver/ and the client's 31-day rescrub anchor is updated.
"""
from __future__ import annotations

import csv
import json
import os
import shutil
import sys
from datetime import date, datetime, timedelta, timezone

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import phone_dnc_identity as pdi  # noqa: E402

COST_PER_LOOKUP = 0.004  # RPV DNC Lookup, cents-level; preview only

PHONE_COLS = ["phone_clean", "line_type", "national_dnc", "state_dnc", "dma",
              "litigator", "lookup_status", "owner_name", "name_match", "call_verdict"]


def san_gate(cfg: dict, assume_yes: bool) -> None:
    """Refuse to run live lookups without a complete, unexpired, confirmed SAN."""
    san = cfg.get("san") or {}
    missing = [k for k in ("organization_id", "san_number", "san_expiration") if not str(san.get(k, "")).strip()]
    if missing:
        sys.exit(
            f"SAN gate: client.yaml is missing {', '.join(missing)}.\n"
            "Fill in the san: block (values from donotcall.gov, never guessed) and re-run.\n"
            "DNC lookups will not run without it."
        )
    try:
        exp = date.fromisoformat(str(san["san_expiration"]).strip())
    except ValueError:
        sys.exit(f"SAN gate: san_expiration '{san['san_expiration']}' is not YYYY-MM-DD.")
    if exp < date.today():
        sys.exit(f"SAN gate: SAN expired {exp}. Renew at donotcall.gov before running.")
    if exp <= date.today() + timedelta(days=30):
        print(f"  WARNING: SAN expires {exp} (within 30 days). Renew soon.")
    if not assume_yes:
        ans = input(
            f"  Is the RPV account currently set to THIS client's SAN "
            f"(#{san['san_number']}, org {san['organization_id']})? [y/N] "
        ).strip().lower()
        if ans != "y":
            sys.exit("Stopped. Switch the SAN in the RPV account first, then re-run.")


def _unique_callable(master: pd.DataFrame, name_col: str | None) -> pd.DataFrame:
    """One row per unique 10-digit phone, carrying a best-effort name for matching."""
    m = master[master["_phone"].str.len() == 10][["_phone"] + ([name_col] if name_col else [])]
    m = m.rename(columns={"_phone": "phone"})
    if name_col:
        m = m.rename(columns={name_col: "name"})
    else:
        m["name"] = ""
    return m.drop_duplicates(subset="phone").reset_index(drop=True)


def _already_done(results_path: str) -> set[str]:
    if not os.path.exists(results_path):
        return set()
    done = set()
    with open(results_path) as f:
        for r in csv.DictReader(f):
            if r.get("lookup_status") == "OK":
                done.add(r.get("phone", ""))
    return done


def plan(master: pd.DataFrame, workdir: str, name_col: str | None = None) -> dict:
    uniq = _unique_callable(master, name_col)
    results_path = os.path.join(workdir, "phone_results.csv")
    done = _already_done(results_path)
    todo = uniq[~uniq["phone"].isin(done)]
    return {
        "callable_contacts": int((master["_phone"].str.len() == 10).sum()),
        "unique_phones": len(uniq),
        "done": len(done),
        "todo": len(todo),
        "est_cost": round(len(todo) * COST_PER_LOOKUP, 2),
        "results_path": results_path,
        "todo_frame": todo,
    }


def _run_batch(frame: pd.DataFrame, workdir: str, tag: str, mock: bool) -> pd.DataFrame:
    """Run one batch through phone_dnc_identity and return its results frame."""
    in_path = os.path.join(workdir, f"phone_input_{tag}.csv")
    out_path = os.path.join(workdir, f"phone_output_{tag}.csv")
    frame.to_csv(in_path, index=False)
    pdi.run(in_path, out_path, phone_col="phone", name_col="name", method="lookup", dry_run=mock)
    return pd.read_csv(out_path, dtype=str).fillna("")


def run(master: pd.DataFrame, paths: dict, cfg: dict, client_name: str,
        assume_yes: bool = False, mock: bool = False) -> dict:
    """Full phone/DNC pass. Returns summary. Mock mode uses the engine's mock
    lookups — output files are suffixed _MOCK and never go to deliver/."""
    workdir = paths["work"]
    name_col = (cfg.get("columns") or {}).get("name")

    if not mock:
        san_gate(cfg, assume_yes)

    p = plan(master, workdir, name_col)
    todo = p["todo_frame"]
    results_path = p["results_path"] if not mock else os.path.join(workdir, "phone_results_MOCK.csv")

    if len(todo) == 0:
        if p["unique_phones"] == 0:
            print("  No callable 10-digit phones in this list. Skipping phone pass.")
        else:
            print("  All unique phones already looked up in this run folder. Nothing to spend.")
    else:
        batches = []
        # First-ever live run for this client: 10-number wiring test first.
        first_live = not mock and not cfg.get("phone_test_passed")
        if first_live and len(todo) > 10:
            test = todo.head(10)
            print(f"\n  First live run for this client — 10-number SAN wiring test first ({len(test)} lookups):")
            test_res = _run_batch(test, workdir, "santest", mock=False)
            for _, r in test_res.iterrows():
                print(f"    {r['phone_clean'] or r['phone']:12} {r['line_type']:9} {r['call_verdict']}")
            fails = int((test_res["call_verdict"] == "LOOKUP_FAILED").sum())
            if fails == len(test_res):
                sys.exit("  All 10 test lookups FAILED — SAN or token is not wired. Nothing more spent.")
            if not assume_yes:
                ans = input("  Do these verdicts look right (SAN wired correctly)? [y/N] ").strip().lower()
                if ans != "y":
                    sys.exit("Stopped after the 10-number test. Fix the RPV setup and re-run; the 10 are checkpointed.")
            batches.append(test_res)
            cfg["phone_test_passed"] = str(date.today())
            todo = todo.iloc[10:]

        if len(todo):
            batches.append(_run_batch(todo, workdir, "MOCK" if mock else "main", mock))

        # Append new results to the cumulative per-phone results file.
        new = pd.concat(batches, ignore_index=True)
        if os.path.exists(results_path):
            old = pd.read_csv(results_path, dtype=str).fillna("")
            new = pd.concat([old, new], ignore_index=True).drop_duplicates(subset="phone", keep="last")
        new.to_csv(results_path, index=False)

    # Merge phone results onto the full master (every contact with that phone).
    if os.path.exists(results_path):
        results = pd.read_csv(results_path, dtype=str).fillna("")
    else:  # list had no callable phones at all
        results = pd.DataFrame(columns=["phone"] + PHONE_COLS)
    # Rename the join key so it can't collide with a client column named "phone".
    results_sel = results[["phone"] + PHONE_COLS].rename(columns={"phone": "_rpv_phone_key"})
    enriched = master.merge(
        results_sel, how="left", left_on="_phone", right_on="_rpv_phone_key",
    ).drop(columns=["_rpv_phone_key"])
    suffix = "_MOCK" if mock else ""
    enriched_path = os.path.join(workdir, f"master_enriched{suffix}.csv")
    enriched.to_csv(enriched_path, index=False)

    counts = results["call_verdict"].value_counts().to_dict() if len(results) else {}
    fails = counts.get("LOOKUP_FAILED", 0)
    if fails:
        print(f"\n  !! {fails} lookups FAILED — these records are NOT marked safe. "
              "Top up RPV / fix throttling and re-run (resumes, no double-spend).")

    manifest_deliver = None
    if not mock:
        # Fresh compliance record covering the cumulative results of this run folder.
        record = {
            "client": cfg.get("display_name", client_name),
            "scrubbed_at_utc": datetime.now(timezone.utc).isoformat(),
            "method": "RPV DNC Lookup",
            "san_number": (cfg.get("san") or {}).get("san_number", ""),
            "records": len(results),
            "registry": "National DNC Registry via RealPhoneValidation",
            "valid_through": (date.today() + timedelta(days=31)).isoformat(),
            "verdict_counts": counts,
        }
        manifest = os.path.join(workdir, "compliance_record.json")
        with open(manifest, "w") as f:
            json.dump(record, f, indent=2)
        manifest_deliver = os.path.join(paths["deliver"], "compliance_record.json")
        shutil.copy2(manifest, manifest_deliver)
        # 31-day rescrub clock starts now.
        cfg["rescrub_anchor"] = str(date.today())
        cfg["next_rescrub"] = (date.today() + timedelta(days=31)).isoformat()

    return {
        "enriched": enriched_path,
        "results": results_path,
        "counts": counts,
        "lookup_failed": fails,
        "compliance_record": manifest_deliver,
    }
