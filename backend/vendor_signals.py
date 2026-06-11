"""
Vendor signal capture for the ReachAudit Vendor Index.

What we store: per-row signal about source quality (hashed domain + outcome).
What we never store: the raw email, name, phone, company, or any PII.

Each /api/scan run writes one row per contact to Supabase. Aggregating across
audits builds the benchmark dataset — "ZoomInfo SaaS contacts under 500
employees have a 31% invalid rate, across N audits" — which feeds vendor
renewal-leverage conversations and (eventually) a public Vendor Index page.

Failure is non-fatal: if Supabase is unreachable, the scan still succeeds.
"""
from __future__ import annotations

import hashlib
import os
import re
import uuid
from typing import Any, Optional

import pandas as pd
import requests as http

from scoring import email_risk, phone_risk


SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
VENDOR_SIGNALS_ENABLED = bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)
TABLE = "vendor_signals"
BATCH_SIZE = 500


# Canonical source names. Anything not in this map maps to its lowercased
# raw value if it matches one of the regex hints below, else "other".
SOURCE_ALIASES: dict[str, str] = {
    "zoominfo": "zoominfo", "zoom info": "zoominfo", "zi": "zoominfo", "zoom_info": "zoominfo",
    "apollo": "apollo", "apollo.io": "apollo",
    "linkedin": "linkedin", "linkedin sales navigator": "linkedin", "sales navigator": "linkedin",
    "lusha": "lusha",
    "cognism": "cognism",
    "leadiq": "leadiq", "lead iq": "leadiq",
    "seamless": "seamless", "seamless.ai": "seamless",
    "clearbit": "clearbit",
    "rocketreach": "rocketreach", "rocket reach": "rocketreach",
    "hunter": "hunter", "hunter.io": "hunter",
    "clay": "clay", "clay.com": "clay",
    "uplead": "uplead", "up lead": "uplead",
    "6sense": "6sense", "sixsense": "6sense",
    "organic": "organic", "inbound": "organic", "website": "organic", "form fill": "organic",
    "website form": "organic", "web form": "organic",
    "manual": "manual", "manual entry": "manual", "manual import": "manual",
    "import": "import", "csv": "import", "csv import": "import",
    "legacy crm": "import", "crm import": "import",
    "referral": "referral",
    "event": "event", "conference": "event", "trade show": "event",
}

# Paid-vendor names safe for substring fallback ("ZoomInfo Export Q2" →
# zoominfo). Only distinctive names; deliberately excludes generic words
# like "import" or "event" that would false-positive.
VENDOR_SUBSTRINGS: list[tuple[str, str]] = [
    ("zoominfo", "zoominfo"),
    ("apollo", "apollo"),
    ("lusha", "lusha"),
    ("cognism", "cognism"),
    ("leadiq", "leadiq"),
    ("seamless", "seamless"),
    ("clearbit", "clearbit"),
    ("rocketreach", "rocketreach"),
    ("salesnavigator", "linkedin"),
    ("linkedin", "linkedin"),
    ("uplead", "uplead"),
    ("6sense", "6sense"),
    # "clay" deliberately absent: too short and common for substring matching.
]


def normalize_source(raw: Any) -> tuple[str, str]:
    """
    Return (normalized, raw_clean) for a source-column value.
    Unknown vendors → "other"; missing → "unknown".
    """
    if raw is None:
        return "unknown", ""
    s = str(raw).strip()
    if not s or s.lower() == "nan":
        return "unknown", ""
    key = s.lower()
    if key in SOURCE_ALIASES:
        return SOURCE_ALIASES[key], s
    # Try a softer match — strip non-alphanumerics
    soft = re.sub(r"[^a-z0-9]", "", key)
    for alias, canonical in SOURCE_ALIASES.items():
        if re.sub(r"[^a-z0-9]", "", alias) == soft:
            return canonical, s
    # Substring fallback for distinctive paid-vendor names, so values like
    # "ZoomInfo Export Q2" still attribute to the vendor.
    for needle, canonical in VENDOR_SUBSTRINGS:
        if needle in soft:
            return canonical, s
    return "other", s


def hash_domain(email: Any) -> Optional[str]:
    """
    SHA-256 of the lowercased domain part of an email. Unsalted on purpose —
    aggregation across audits requires the same domain → same hash.
    Returns None if there's no extractable domain.
    """
    if email is None:
        return None
    s = str(email).strip().lower()
    if "@" not in s:
        return None
    domain = s.rsplit("@", 1)[1]
    if not domain or "." not in domain:
        return None
    return hashlib.sha256(domain.encode("utf-8")).hexdigest()


def find_first_col(df: pd.DataFrame, candidates: list[str]) -> Optional[str]:
    """Match candidates case-insensitively against actual column names."""
    lower_map = {c.lower(): c for c in df.columns}
    for c in candidates:
        if c in lower_map:
            return lower_map[c]
    return None


INDUSTRY_COL_HINTS = ["industry", "vertical", "sector", "naics_industry"]
COMPANY_SIZE_COL_HINTS = [
    "employees", "employee_count", "headcount", "company_size",
    "size", "num_employees", "employees_range",
]


def bucket_company_size(raw: Any) -> Optional[str]:
    """
    Bucket a company-size value into a canonical range. Accepts ints,
    decimal strings, or pre-bucketed strings like '51-200'. Returns None
    if the value is missing or unparseable.
    """
    if raw is None:
        return None
    s = str(raw).strip().lower()
    if not s or s == "nan":
        return None
    digits = re.findall(r"\d+", s.replace(",", ""))
    if not digits:
        return None
    n = int(digits[-1]) if "+" in s or "above" in s or len(digits) == 1 else int(digits[0])
    if n <= 50: return "1-50"
    if n <= 200: return "51-200"
    if n <= 500: return "201-500"
    if n <= 1000: return "501-1000"
    return "1000+"


def build_signal_rows(
    df: pd.DataFrame,
    email_col: str,
    source_col: Optional[str],
    phone_col: Optional[str],
    scan_id: str,
) -> list[dict]:
    """
    Build per-row anonymized signal records. No PII. One row per CSV record
    that has a hashable domain.
    """
    industry_col = find_first_col(df, INDUSTRY_COL_HINTS)
    size_col = find_first_col(df, COMPANY_SIZE_COL_HINTS)

    rows: list[dict] = []
    emails = df[email_col].astype(str).fillna("").tolist()
    sources = df[source_col].tolist() if source_col and source_col in df.columns else [None] * len(df)
    phones = df[phone_col].tolist() if phone_col and phone_col in df.columns else [None] * len(df)
    industries = df[industry_col].tolist() if industry_col else [None] * len(df)
    sizes = df[size_col].tolist() if size_col else [None] * len(df)

    for email, src, phone, ind, sz in zip(emails, sources, phones, industries, sizes):
        domain_h = hash_domain(email)
        if domain_h is None:
            # Don't store rows without a hashable domain — they tell us nothing
            # about vendor quality.
            continue
        email_r, email_reason = email_risk(email)
        phone_r, _ = phone_risk(phone) if phone is not None else ("", "")
        source_normalized, source_raw_clean = normalize_source(src)
        rows.append({
            "scan_id": scan_id,
            "domain_hash": domain_h,
            "source_normalized": source_normalized,
            "source_raw": source_raw_clean or None,
            "email_risk": email_r,
            "email_reason": email_reason,
            "phone_risk": phone_r or None,
            "industry": _clean_text(ind),
            "company_size_bucket": bucket_company_size(sz),
        })
    return rows


def _clean_text(raw: Any) -> Optional[str]:
    if raw is None:
        return None
    s = str(raw).strip()
    if not s or s.lower() == "nan":
        return None
    return s.lower()[:80]


def submit_signals(rows: list[dict]) -> tuple[int, Optional[str]]:
    """
    Best-effort batched insert into Supabase. Returns (inserted_count, error).
    Errors are returned, not raised — telemetry must never break the scan.
    """
    if not VENDOR_SIGNALS_ENABLED:
        return 0, "disabled"
    if not rows:
        return 0, None

    url = f"{SUPABASE_URL}/rest/v1/{TABLE}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    inserted = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        try:
            resp = http.post(url, json=batch, headers=headers, timeout=15)
        except Exception as exc:
            return inserted, f"network error: {exc}"
        if not resp.ok:
            return inserted, f"http {resp.status_code}: {resp.text[:200]}"
        inserted += len(batch)
    return inserted, None


def capture_scan_signals(
    df: pd.DataFrame,
    email_col: str,
    source_col: Optional[str],
    phone_col: Optional[str],
) -> dict:
    """
    Top-level capture entry point. Builds rows, submits, returns a small
    status dict. Never raises — failure here cannot break the scan response.
    """
    if not VENDOR_SIGNALS_ENABLED:
        return {"enabled": False, "captured": 0}
    scan_id = str(uuid.uuid4())
    try:
        rows = build_signal_rows(df, email_col, source_col, phone_col, scan_id)
    except Exception as exc:
        return {"enabled": True, "captured": 0, "error": f"build error: {exc}"}
    inserted, error = submit_signals(rows)
    return {
        "enabled": True,
        "scan_id": scan_id,
        "captured": inserted,
        "intended": len(rows),
        "error": error,
    }
