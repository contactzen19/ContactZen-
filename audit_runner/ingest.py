"""ingest.py — module 1 of the audit runner.

Reads any client CSV/XLSX list(s), maps columns (guessing on first run,
saved mapping after that), merges multiple lists, dedupes, normalizes
phones. Output: work/master.csv plus the mapping written back to client.yaml.

Column guessing reuses reachability_core.guess_* — the same logic the free
tool uses, so a column that maps one way in the app maps the same way here.
No vendor name is ever hardcoded; the source column is read as-is.
"""
from __future__ import annotations

import os
import shutil
import sys

import pandas as pd

# audit_runner/ sits inside ContactZen; reachability_core.py is one level up.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from reachability_core import (  # noqa: E402
    guess_email_col,
    guess_phone_col,
    guess_source_col,
    normalize_col,
    normalize_phone,
)


def read_list(path: str) -> pd.DataFrame:
    if path.lower().endswith((".xlsx", ".xls")):
        df = pd.read_excel(path, dtype=str)
    else:
        df = pd.read_csv(path, dtype=str)
    return normalize_col(df)


def resolve_mapping(df: pd.DataFrame, saved: dict, assume_yes: bool) -> dict:
    """Use the saved mapping when its columns exist in this file; otherwise
    guess and (unless --yes) let Joey confirm or correct."""
    mapping = {}
    for key, guesser in (("email", guess_email_col), ("phone", guess_phone_col), ("source", guess_source_col)):
        col = saved.get(key)
        if col and col in df.columns:
            mapping[key] = col
            continue
        col = guesser(df)
        if not assume_yes:
            shown = col or "(none found)"
            ans = input(f"  {key} column [{shown}]: ").strip()
            if ans:
                col = ans if ans.lower() != "none" else None
        if col and col not in df.columns:
            sys.exit(f"Column '{col}' not in file. Columns are: {', '.join(df.columns)}")
        mapping[key] = col
    if not mapping.get("email") and not mapping.get("phone"):
        sys.exit("Need at least an email or a phone column to audit anything.")
    return mapping


def run(list_paths: list[str], paths: dict, cfg: dict, assume_yes: bool = False) -> dict:
    """Ingest one or more lists into work/master.csv. Returns summary stats."""
    frames = []
    mapping = dict(cfg.get("columns") or {})
    for lp in list_paths:
        if not os.path.exists(lp):
            sys.exit(f"List not found: {lp}")
        # Keep the customer's raw file untouched in input/.
        shutil.copy2(lp, os.path.join(paths["input"], os.path.basename(lp)))
        df = read_list(lp)
        if not mapping:
            print(f"\nColumn mapping for {os.path.basename(lp)} (Enter accepts the guess, type a name to override, 'none' to skip):")
            mapping = resolve_mapping(df, {}, assume_yes)
        else:
            mapping = resolve_mapping(df, mapping, True)
        df["_source_file"] = os.path.basename(lp)
        frames.append(df)

    master = pd.concat(frames, ignore_index=True)
    raw_rows = len(master)

    ecol, pcol = mapping.get("email"), mapping.get("phone")
    master["_email"] = master[ecol].fillna("").str.strip().str.lower() if ecol else ""
    master["_phone"] = master[pcol].map(normalize_phone) if pcol else ""

    # Dedupe: same email (when present) or same phone (when no email) is one contact.
    key = master["_email"].where(master["_email"] != "", "phone:" + master["_phone"])
    dupes = int((key.duplicated() & (key != "phone:")).sum())
    master = master[~(key.duplicated() & (key != "phone:"))].reset_index(drop=True)

    out = os.path.join(paths["work"], "master.csv")
    master.to_csv(out, index=False)

    stats = {
        "files": len(list_paths),
        "raw_rows": raw_rows,
        "contacts": len(master),
        "dupes_removed": dupes,
        "with_email": int((master["_email"] != "").sum()),
        "with_phone": int((master["_phone"].str.len() >= 10).sum()),
        "mapping": mapping,
        "master": out,
    }
    cfg["columns"] = mapping
    return stats
