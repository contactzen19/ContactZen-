"""delta.py — module 7 of the audit runner (M5): the month-over-month story.

Compares this run's analyzed contacts against the client's most recent
previous run and reports what CHANGED: contacts that went dead, new DNC
hits, verdict migrations, new and departed records. This is the retention
story the retainer pays for, and it costs nothing to compute, so it runs
automatically whenever a previous run folder exists.

Contacts are keyed by email (lowercased) when present, else by 10-digit
phone. The delta is appended to the report draft and saved standalone.
"""
from __future__ import annotations

import os

import pandas as pd

import clientcfg


def _key(df: pd.DataFrame) -> pd.Series:
    email = df.get("_email", pd.Series([""] * len(df))).fillna("")
    phone = df.get("_phone", pd.Series([""] * len(df))).fillna("")
    return email.where(email != "", "phone:" + phone)


def find_previous(client: str, current_stamp: str, mock: bool = False) -> str | None:
    """Most recent prior run folder that has an analyzed frame."""
    suffix = "_MOCK" if mock else ""
    base = clientcfg.client_dir(client)
    stamps = sorted(
        d for d in os.listdir(base)
        if os.path.isdir(os.path.join(base, d)) and d != current_stamp
        and os.path.exists(os.path.join(base, d, "work", f"analyzed{suffix}.csv"))
    )
    return stamps[-1] if stamps else None


def run(client: str, current_stamp: str, paths: dict, mock: bool = False) -> dict | None:
    suffix = "_MOCK" if mock else ""
    prev_stamp = find_previous(client, current_stamp, mock)
    if not prev_stamp:
        return None

    prev = pd.read_csv(
        os.path.join(clientcfg.client_dir(client), prev_stamp, "work", f"analyzed{suffix}.csv"),
        dtype=str, keep_default_na=False)
    cur = pd.read_csv(os.path.join(paths["work"], f"analyzed{suffix}.csv"),
                      dtype=str, keep_default_na=False)
    prev["_k"], cur["_k"] = _key(prev), _key(cur)
    prev = prev.drop_duplicates("_k").set_index("_k")
    cur = cur.drop_duplicates("_k").set_index("_k")

    both = cur.index.intersection(prev.index)
    new_contacts = len(cur.index.difference(prev.index))
    gone_contacts = len(prev.index.difference(cur.index))

    pj = prev.loc[both]
    cj = cur.loc[both]

    went_dead = int(((pj["contact_verdict"] != "Dead") & (cj["contact_verdict"] == "Dead")).sum())
    recovered = int(((pj["contact_verdict"] == "Dead") & (cj["contact_verdict"] != "Dead")).sum())
    was_dnc = pj["call_verdict"].astype(str).str.startswith("DO_NOT_CALL")
    is_dnc = cj["call_verdict"].astype(str).str.startswith("DO_NOT_CALL")
    new_dnc = int((~was_dnc & is_dnc).sum())
    off_dnc = int((was_dnc & ~is_dnc).sum())
    email_died = int(((pj["email_bucket"] == "reachable") & (cj["email_bucket"] != "reachable")).sum())

    L = [
        "",
        f"## Since your last audit ({prev_stamp})",
        "",
        f"Tracked {len(both):,} contacts across both runs "
        f"({new_contacts:,} new this month, {gone_contacts:,} no longer in the file).",
        "",
        f"- **{went_dead:,} contacts went dead** since {prev_stamp}."
        + (f" {recovered:,} recovered." if recovered else ""),
        f"- **{new_dnc:,} phone numbers joined a Do Not Call registry.** "
        "These were callable last month and are not now."
        + (f" {off_dnc:,} came off the registry." if off_dnc else ""),
        f"- {email_died:,} previously reachable email addresses stopped being deliverable.",
        "",
        "This is why the audit repeats: a clean list decays every month, and DNC status "
        "changes without notice. The 31-day rescrub keeps your safe-harbor protection current.",
    ]
    text = "\n".join(L)

    delta_path = os.path.join(paths["work"], f"delta{suffix}.md")
    with open(delta_path, "w") as f:
        f.write(text.strip() + "\n")

    # Append to the report draft so the story ships inside the deliverable.
    draft = os.path.join(paths["work"], f"report_draft{suffix}.md")
    if os.path.exists(draft):
        with open(draft, "a") as f:
            f.write("\n" + text + "\n")

    return {
        "previous": prev_stamp,
        "tracked": len(both),
        "new_contacts": new_contacts,
        "gone_contacts": gone_contacts,
        "went_dead": went_dead,
        "new_dnc": new_dnc,
        "email_died": email_died,
        "delta_md": delta_path,
    }
