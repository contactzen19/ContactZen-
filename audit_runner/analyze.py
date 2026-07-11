"""analyze.py — module 4 of the audit runner (M3).

Joins email (ZeroBounce) + phone (RPV) results into the locked contact
verdicts and produces the audit numbers. Offline, no network, no spend.
Lifted from ONEinsurance/analyze.py, generalized (no hardcoded columns or
vendor names) and upgraded to fold DNC + line type into the verdict — the
"core teeth" decision from the 6/30 scope.

Buckets follow METHODOLOGY.md:
  email:  reachable (valid) / unreachable (invalid, spamtrap, abuse,
          do_not_mail) / ambiguous (catch-all, unknown)
  phone:  callable (SAFE_TO_CALL / SAFE_BUT_NAME_MISMATCH), DNC
          (DO_NOT_CALL*), failed (LOOKUP_FAILED — never treated as safe)
  contact: Reachable / At-risk / Dead

Outputs: work/audit_summary.txt (the numbers, human-readable) and the
record-by-record evidence CSV (deliver/ on live runs, work/ on mock).
"""
from __future__ import annotations

import os

import pandas as pd

EMAIL_REACHABLE = {"valid"}
EMAIL_UNREACHABLE = {"invalid", "spamtrap", "abuse", "do_not_mail", "donotmail"}
EMAIL_AMBIGUOUS = {"catch-all", "unknown"}
NEVER_EMAIL = {"abuse", "do_not_mail", "donotmail", "spamtrap"}
CALLABLE = {"SAFE_TO_CALL", "SAFE_BUT_NAME_MISMATCH"}


def email_bucket(status: str) -> str:
    s = (status or "").lower()
    if s in EMAIL_REACHABLE:
        return "reachable"
    if s in EMAIL_UNREACHABLE:
        return "unreachable"
    if s in EMAIL_AMBIGUOUS:
        return "ambiguous"
    return "not_verified"


def contact_verdict(r) -> str:
    """One contact, one verdict. A contact is Reachable if any channel could
    produce a human reply; Dead if no channel can; At-risk in between."""
    email_ok = r["email_bucket"] == "reachable"
    email_maybe = r["email_bucket"] in ("ambiguous", "not_verified")
    phone_ok = r["call_verdict"] in CALLABLE
    phone_unknown = r["call_verdict"] in ("", "LOOKUP_FAILED")
    if email_ok or phone_ok:
        return "Reachable"
    if email_maybe or phone_unknown:
        return "At-risk"
    return "Dead"


def channel_rec(r) -> str:
    email_ok = r["email_bucket"] == "reachable" and (r["zb_status"] or "").lower() not in NEVER_EMAIL
    phone_ok = r["call_verdict"] in CALLABLE
    dnc = str(r["call_verdict"]).startswith("DO_NOT_CALL")
    if email_ok and phone_ok:
        return "call+email"
    if email_ok:
        return "email-only" + (" (DNC)" if dnc else "")
    if phone_ok:
        return "call-only"
    return "suppress"


def run(paths: dict, cfg: dict, mock: bool = False) -> dict:
    workdir = paths["work"]
    suffix = "_MOCK" if mock else ""

    enriched_path = os.path.join(workdir, f"master_enriched{suffix}.csv")
    if not os.path.exists(enriched_path):
        enriched_path = os.path.join(workdir, "master.csv")  # --skip-phone runs
    m = pd.read_csv(enriched_path, dtype=str, keep_default_na=False)

    # Phone columns may be absent (skip-phone) — normalize their presence.
    for c in ("call_verdict", "line_type", "national_dnc", "state_dnc", "litigator", "lookup_status"):
        if c not in m.columns:
            m[c] = ""

    # Join ZeroBounce results (may be absent if the list had no emails).
    zb_path = os.path.join(workdir, "zb_results.csv")
    if os.path.exists(zb_path):
        zb = pd.read_csv(zb_path, dtype=str, keep_default_na=False)
        zb["email"] = zb["email"].str.strip().str.lower()
        zb = zb.drop_duplicates("email")
        m["zb_status"] = m["_email"].map(dict(zip(zb["email"], zb["zb_status"]))).fillna("not_verified")
        m["zb_sub_status"] = m["_email"].map(dict(zip(zb["email"], zb["zb_sub_status"]))).fillna("")
    else:
        m["zb_status"], m["zb_sub_status"] = "not_verified", ""

    m["email_bucket"] = m["zb_status"].map(email_bucket)
    m["contact_verdict"] = m.apply(contact_verdict, axis=1)
    m["recommended_channel"] = m.apply(channel_rec, axis=1)

    # ---- the numbers --------------------------------------------------------
    out: list[str] = []

    def line(s: str = "") -> None:
        out.append(s)

    n = len(m)
    vc = m["contact_verdict"].value_counts()
    reach, risk, dead = vc.get("Reachable", 0), vc.get("At-risk", 0), vc.get("Dead", 0)
    title = cfg.get("display_name", "Client")
    line("=" * 64)
    line(f"{title.upper()} — REACHABILITY ({n} contacts)")
    line("=" * 64)
    line(f"  Reachable: {reach}  ({reach/n:.1%})")
    line(f"  At-risk:   {risk}  ({risk/n:.1%})")
    line(f"  Dead:      {dead}  ({dead/n:.1%})")

    dnc_n = int(m["call_verdict"].astype(str).str.startswith("DO_NOT_CALL").sum())
    lit_n = int((m["call_verdict"] == "DO_NOT_CALL_LITIGATOR").sum())
    fail_n = int((m["call_verdict"] == "LOOKUP_FAILED").sum())
    if m["call_verdict"].astype(str).str.len().sum() > 0:
        line("")
        line("--- Compliance (phones) ---")
        line(f"  On a Do Not Call registry: {dnc_n}" + (f"  (incl. {lit_n} known TCPA litigator)" if lit_n else ""))
        line(f"  Lookup failed (NOT marked safe): {fail_n}")

    # Source attribution — whatever source column the client's file has.
    src_col = (cfg.get("columns") or {}).get("source")
    if src_col and src_col in m.columns:
        line("")
        line("--- Reachability by source ---")
        g = m.groupby(src_col)["contact_verdict"].value_counts().unstack(fill_value=0)
        for k in ("Reachable", "At-risk", "Dead"):
            if k not in g.columns:
                g[k] = 0
        g["total"] = g.sum(axis=1)
        g = g.sort_values("total", ascending=False)
        spend = cfg.get("vendor_spend") or {}
        for idx, r in g.iterrows():
            row = (f"  {str(idx)[:30]:30} n={int(r['total']):5}  "
                   f"reachable={r['Reachable']/r['total']:5.1%}  dead={r['Dead']/r['total']:5.1%}")
            # CPRC = vendor spend / reachable contacts delivered (METHODOLOGY.md).
            if str(idx) in spend and r["Reachable"] > 0:
                row += f"  CPRC=${spend[str(idx)]/r['Reachable']:,.2f}"
            line(row)
        if not spend:
            line("  (add vendor_spend to client.yaml to dollarize CPRC — flagged estimate until then)")

    line("")
    line("--- Channel view ---")
    for ch, cnt in m["recommended_channel"].value_counts().items():
        line(f"  {ch:16} {cnt}")

    summary_path = os.path.join(workdir, f"audit_summary{suffix}.txt")
    with open(summary_path, "w") as f:
        f.write("\n".join(out))
    print("\n".join("  " + s for s in out))

    # Evidence CSV — record-by-record verdicts (deliverable #2 in the spec).
    evidence_cols = [c for c in m.columns if not c.startswith("_")]
    dest = paths["deliver"] if not mock else workdir
    evidence_path = os.path.join(dest, f"evidence{suffix}.csv")
    m[evidence_cols].to_csv(evidence_path, index=False)

    return {
        "frame": m,
        "summary": summary_path,
        "evidence": evidence_path,
        "verdicts": {"Reachable": int(reach), "At-risk": int(risk), "Dead": int(dead)},
        "dnc": dnc_n,
        "lookup_failed": fail_n,
    }
