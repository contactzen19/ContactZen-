"""report_draft.py — module 6 of the audit runner (M4).

Fills AUDIT_REPORT_TEMPLATE.md's locked 9-section structure from the analyze
output. The output is a MARKDOWN DRAFT in work/ — it never ships directly.
Joey reviews it against the checklist run_audit prints, edits, then makes
the PDF. Guardrails from the template are baked in, not re-decided here:
one reachable definition inline, Levers 1 and 2 a choice never a sum, every
defaulted input flagged as an estimate, no credit/refund promises, vendors
named only in neutral tables.

Fact-finder inputs come from client.yaml's roi: block. Anything missing
uses the locked default and is flagged "(estimate — default)" in the draft.
"""
from __future__ import annotations

import os
from datetime import date

import pandas as pd

# Locked defaults (METHODOLOGY.md / template). Each is flagged when used.
DEFAULTS = {
    "reps": 1,
    "loaded_comp": 75000,
    "selling_time_pct": 0.35,   # conservative floor, never lower
    "coverage_pct": 0.40,
    "reply_rate": 0.015,
    "mtg_to_deal_pct": 0.20,
    "acv": 0,
    "annual_data_spend": 0,
}

REACHABLE_DEF = (
    "Unreachable means: hard bounces and invalid addresses or numbers, departed or "
    "role-changed contacts, abandoned inboxes (12+ months silent despite delivery), "
    "and catch-all noise. Reachable means the contact could produce a human reply."
)


def _roi(cfg: dict) -> tuple[dict, set]:
    given = cfg.get("roi") or {}
    vals, estimated = {}, set()
    for k, d in DEFAULTS.items():
        if k in given and given[k] not in ("", None):
            vals[k] = float(given[k])
        else:
            vals[k] = float(d)
            estimated.add(k)
    return vals, estimated


def _fmt_money(x: float) -> str:
    return f"${x:,.0f}"


def run(a: dict, paths: dict, cfg: dict, list_label: str, mock: bool = False) -> dict:
    m: pd.DataFrame = a["frame"]
    n = len(m)
    v = a["verdicts"]
    dead, risk, reach = v["Dead"], v["At-risk"], v["Reachable"]
    unreach = dead + risk                      # headline: bad + ambiguous, per methodology
    x = unreach / n if n else 0.0
    roi, est = _roi(cfg)

    def flag(k: str) -> str:
        return " *(estimate — default; update roi: in client.yaml)*" if k in est else ""

    zb = m["zb_status"].str.lower()
    emails_n = int((m["_email"] != "").sum())
    hard = int(zb.isin(["invalid", "spamtrap", "abuse", "do_not_mail", "donotmail"]).sum())
    catchall = int((zb == "catch-all").sum())
    hb_rate = hard / emails_n if emails_n else 0.0

    lever1 = roi["reps"] * roi["loaded_comp"] * roi["selling_time_pct"] * x
    lever2 = unreach * roi["coverage_pct"] * roi["reply_rate"] * roi["mtg_to_deal_pct"] * roi["acv"]
    lever3 = roi["annual_data_spend"] * x

    client = cfg.get("display_name", "Client")
    L: list[str] = []
    add = L.append

    add(f"# Reachability Audit — {client}")
    add("")
    add(f"Prepared by: ReachAudit · reachaudit.com")
    add(f"Date: {date.today():%B %d, %Y} · File scanned: {list_label} · Records analyzed: {n:,}")
    add("")
    add("An independent measurement of how much of your contact data can actually be "
        "reached, and where the unreachable records came from.")
    add("")

    # 1. The Finding ---------------------------------------------------------
    add("## 1. The Finding")
    add("")
    add(f"> **{x:.0%} of the contacts in your file cannot be reached or are at serious risk.**")
    add("")
    add(REACHABLE_DEF)
    add("")
    add(f"That is **{unreach:,} of {n:,} records** ({dead:,} dead on every channel, "
        f"{risk:,} at risk). Reachable now: **{reach:,} ({reach/n:.0%})**.")
    add("")
    add("| Bucket | Records | % of file |")
    add("|---|---|---|")
    add(f"| Hard bounce / invalid email | {hard:,} | {hard/n:.1%} |")
    add(f"| Catch-all noise | {catchall:,} | {catchall/n:.1%} |")
    add("| Departed / role change | not measured in this pass | — |")
    add("| Abandoned inbox (12+ mo silent) | not measured (no engagement dates supplied) | — |")
    dnc = a.get("dnc", 0)
    if dnc:
        add(f"| On a Do Not Call registry (legal exposure, not counted above) | {dnc:,} | {dnc/n:.1%} |")
    add("")

    # 2. Lever 1 -------------------------------------------------------------
    add("## 2. Wasted Rep Capacity — the headline")
    add("")
    add("The dollars your team already spends working records that were never going to respond.")
    add("")
    add("```")
    add(f"Reps x Loaded comp x Selling-time% x Unreachable%")
    add(f"= {roi['reps']:.0f} x {_fmt_money(roi['loaded_comp'])} x {roi['selling_time_pct']:.0%} x {x:.0%}")
    add(f"= {_fmt_money(lever1)} per year")
    add("```")
    add("")
    add(f"Per rep: **{_fmt_money(lever1 / max(roi['reps'], 1))}/yr.**")
    add(f"Inputs: reps{flag('reps')}, loaded comp{flag('loaded_comp')}, "
        f"selling time 35% (conservative floor){flag('selling_time_pct')}. "
        "If your reps sell more than 35% of their time, this number goes up, not down.")
    add("")

    # 3. Source map ----------------------------------------------------------
    src_col = (cfg.get("columns") or {}).get("source")
    add("## 3. The Source Map — who delivered the dead records")
    add("")
    if src_col and src_col in m.columns:
        add("| Source | Records | Unreachable % | Share of all dead records |")
        add("|---|---|---|---|")
        g = m.groupby(src_col)["contact_verdict"].value_counts().unstack(fill_value=0)
        for k in ("Reachable", "At-risk", "Dead"):
            if k not in g.columns:
                g[k] = 0
        g["total"] = g.sum(axis=1)
        g["unreach"] = g["At-risk"] + g["Dead"]
        g = g.sort_values("unreach", ascending=False)
        tot_unreach = max(int(g["unreach"].sum()), 1)
        for idx, r in g.iterrows():
            add(f"| {idx} | {int(r['total']):,} | {r['unreach']/r['total']:.1%} | {r['unreach']/tot_unreach:.1%} |")
    else:
        add("*No source column in the file — source attribution not possible this pass. "
            "Ask the client which vendor(s) each list came from.*")
    add("")

    # 4. CPRC ----------------------------------------------------------------
    add("## 4. Cost Per Reachable Contact (CPRC) — the renewal number")
    add("")
    add("CPRC = total spend with a vendor / reachable contacts they delivered.")
    add("")
    spend = cfg.get("vendor_spend") or {}
    if spend and src_col and src_col in m.columns:
        add("| Source | Annual spend | Cost / contact | Reachable rate | CPRC | Overpay* |")
        add("|---|---|---|---|---|---|")
        for vendor, amt in spend.items():
            sub = m[m[src_col] == vendor]
            if not len(sub):
                continue
            t = len(sub)
            r_n = int((sub["contact_verdict"] == "Reachable").sum())
            rrate = r_n / t
            cpc = amt / t
            cprc = amt / r_n if r_n else float("inf")
            overpay = amt - amt * rrate
            add(f"| {vendor} | {_fmt_money(amt)} | ${cpc:,.2f} | {rrate:.0%} | "
                f"**${cprc:,.2f}** | {_fmt_money(overpay)} |")
        add("")
        add("\\* Overpay = annual spend − (annual spend × reachable rate). What the same "
            "contract is worth if you only pay for contacts that are real.")
    else:
        add("*Add vendor_spend to client.yaml to fill this table (spend per vendor, annual $).*")
    add("")

    # 5. Lever 2 -------------------------------------------------------------
    add("## 5. Recoverable Pipeline — the upside (a choice, not an addition)")
    add("")
    if roi["acv"] > 0:
        add("```")
        add(f"(Unreachable x coverage%) x reply% x mtg-to-deal% x ACV")
        add(f"= {unreach:,} x {roi['coverage_pct']:.0%} x {roi['reply_rate']:.1%} x "
            f"{roi['mtg_to_deal_pct']:.0%} x {_fmt_money(roi['acv'])}")
        add(f"= {_fmt_money(lever2)} per year")
        add("```")
        add("")
        add(f"Either you keep paying {_fmt_money(lever1)} for ghosts, or those hours produce "
            f"{_fmt_money(lever2)} in pipeline. Same hours, two ways to see them. Pick one.")
        add(f"Defaults flagged: coverage{flag('coverage_pct')}, reply{flag('reply_rate')}, "
            f"mtg-to-deal{flag('mtg_to_deal_pct')}, ACV{flag('acv')}.")
    else:
        add("*Needs ACV (average contract value) in client.yaml's roi: block. "
            "Present this as a CHOICE against Lever 1, never a sum.*")
    add("")

    # 6. Deliverability ------------------------------------------------------
    add("## 6. Deliverability Risk — the multiplier")
    add("")
    add(f"- If you emailed this list today, about **{hb_rate:.1%}** would hard-bounce.")
    add("- Sender-reputation guidance treats sustained hard bounces above ~2% as reputation "
        "damage; sending platforms throttle or suspend accounts around ~5%+.")
    add("- This hits your whole domain: one bad list burns every rep's deliverability at "
        "once, including to the good contacts.")
    add("")

    # 7. Lever 3 -------------------------------------------------------------
    add("## 7. Wasted Data Spend — footnote")
    add("")
    if roi["annual_data_spend"] > 0:
        add(f"Annual data spend × Unreachable% = {_fmt_money(roi['annual_data_spend'])} × {x:.0%} "
            f"= **{_fmt_money(lever3)}**{flag('annual_data_spend')}")
        add("")
        add(f"{x:.0%} of your data spend bought records that can't be reached, documented "
            "record by record in the evidence file you keep. Where a vendor agreement "
            "includes replacement or quality terms, that file supports the conversation.")
    else:
        add("*Needs annual_data_spend in client.yaml's roi: block. This is the only "
            "recapture mention — upside, never a promise.*")
    add("")

    # 8 + 9 ------------------------------------------------------------------
    add("## 8. What you keep — the evidence file")
    add("")
    add("A record-by-record file: every contact, its reachability verdict, the reason, and "
        "the source it came from. Your data, your file. It is the proof behind every number "
        "above and the input to your next vendor conversation.")
    add("")
    add("Your file was processed on our side and is not retained. We keep aggregate counts "
        "and rates for this report only — never your contact records.")
    add("")
    add("## 9. Recommended next step")
    add("")
    add("Re-allocate the next order toward the sources with the lowest CPRC. Then re-audit "
        "on a schedule: lead quality is not a one-time event, and sources that scored well "
        "this quarter degrade.")
    add("")
    add("Contact: Joey · ReachAudit · reachaudit.com")
    add("")

    suffix = "_MOCK" if mock else ""
    out = os.path.join(paths["work"], f"report_draft{suffix}.md")
    with open(out, "w") as f:
        f.write("\n".join(L))
    return {"draft": out, "unreachable_pct": x, "lever1": lever1, "estimated_fields": sorted(est)}


CHECKLIST = """
------------------------------------------------------------------
REVIEW GATE — nothing ships until every box is checked by a human
------------------------------------------------------------------
[ ] Reachable definition appears inline with the headline number
[ ] Lever 1 and Lever 2 presented as a choice, never summed
[ ] Every estimated input flagged in-line; selling-time floor 35%
[ ] Vendors named only in neutral tables; no credit/refund promises
[ ] Spot-check 5 random evidence rows against raw ZB/RPV output
[ ] LOOKUP_FAILED count reviewed (never silently dropped)
[ ] Compliance JSON date correct; rescrub date logged
[ ] No em-dashes in customer copy; reads in ReachAudit voice
[ ] Brand is ReachAudit everywhere (never "ContactZen")
------------------------------------------------------------------"""
