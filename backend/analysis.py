from typing import Optional

import pandas as pd

from scoring import email_risk, phone_risk, normalize_phone


def guess_email_col(df: pd.DataFrame) -> Optional[str]:
    candidates = ["email", "email_address", "work_email", "emailaddress"]
    for c in candidates:
        if c in df.columns:
            return c
    for c in df.columns:
        if "email" in c:
            return c
    return None


def guess_source_col(df: pd.DataFrame) -> Optional[str]:
    candidates = ["source", "lead_source", "contact_source", "data_source"]
    for c in candidates:
        if c in df.columns:
            return c
    return None


def guess_phone_col(df: pd.DataFrame) -> Optional[str]:
    candidates = ["phone", "mobile_phone", "work_phone", "direct_phone", "phone_number"]
    for c in candidates:
        if c in df.columns:
            return c
    for c in df.columns:
        if "phone" in c:
            return c
    return None


def guess_last_send_col(df: pd.DataFrame) -> Optional[str]:
    candidates = [
        "last_email_send_date", "last_email_sent_date", "last_email_send",
        "last_email_sent", "last_sent_date", "last_email_date",
        "hs_email_last_send_date",
    ]
    for c in candidates:
        if c in df.columns:
            return c
    return None


def guess_last_open_col(df: pd.DataFrame) -> Optional[str]:
    candidates = [
        "last_email_open_date", "last_email_opened_date", "last_email_open",
        "last_email_opened", "last_opened_date", "hs_email_last_open_date",
    ]
    for c in candidates:
        if c in df.columns:
            return c
    return None


def guess_last_reply_col(df: pd.DataFrame) -> Optional[str]:
    candidates = [
        "last_email_reply_date", "last_email_replied_date", "last_email_reply",
        "last_email_replied", "last_replied_date", "hs_email_last_reply_date",
    ]
    for c in candidates:
        if c in df.columns:
            return c
    return None


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = [c.strip().lower() for c in df.columns]
    return df


def compute_completeness(df: pd.DataFrame, email_col: str, phone_col: Optional[str]) -> dict:
    key_field_candidates = {
        "First Name": ["first_name", "firstname", "fname"],
        "Last Name":  ["last_name", "lastname", "lname"],
        "Full Name":  ["name", "full_name", "fullname", "contact_name"],
        "Company":    ["company", "company_name", "organization", "account_name", "account"],
        "Title":      ["title", "job_title", "jobtitle", "position", "role"],
        "Email":      [email_col],
        "Phone":      [phone_col] if phone_col else [],
    }

    found_fields = {}
    for label, candidates in key_field_candidates.items():
        for c in candidates:
            if c and c in df.columns:
                found_fields[label] = c
                break

    total = len(df)
    field_fill_rates = {}
    for label, col in found_fields.items():
        filled = (
            df[col].astype(str).str.strip()
            .replace("", pd.NA).replace("nan", pd.NA)
            .notna().sum()
        )
        field_fill_rates[label] = round(int(filled) / total, 4) if total else 0.0

    completeness_score = (
        int(round(sum(field_fill_rates.values()) / len(field_fill_rates) * 100))
        if field_fill_rates else 0
    )

    return {"completeness_score": completeness_score, "field_fill_rates": field_fill_rates}


def compute_duplicates(df: pd.DataFrame, email_col: str, phone_col: Optional[str]) -> dict:
    emails = df[email_col].astype(str).str.strip().str.lower()
    email_dupe_mask = emails.duplicated(keep=False) & ~emails.isin(["", "nan"])
    email_dupes = int(email_dupe_mask.sum())

    phone_dupes = 0
    if phone_col and phone_col in df.columns:
        phones = df[phone_col].astype(str).apply(normalize_phone)
        phone_dupe_mask = phones.duplicated(keep=False) & (phones.str.len() >= 10)
        phone_dupes = int(phone_dupe_mask.sum())

    return {"email_dupes": email_dupes, "phone_dupes": phone_dupes}


# Methodology window for abandoned-inbox detection (locked at 12 months per
# METHODOLOGY.md). Configurable in code; intentionally not exposed in the UI.
ABANDONED_INBOX_WINDOW_DAYS = 365


def compute_scan(
    df: pd.DataFrame,
    email_col: str,
    source_col: Optional[str] = None,
    phone_col: Optional[str] = None,
    last_send_col: Optional[str] = None,
    last_open_col: Optional[str] = None,
    last_reply_col: Optional[str] = None,
) -> dict:
    df_out = df.copy()

    # Email scoring
    risks = [email_risk(e) for e in df_out[email_col].astype(str).fillna("").tolist()]
    df_out["cz_risk"] = [r[0] for r in risks]
    df_out["cz_reason"] = [r[1] for r in risks]

    total = len(df_out)
    invalid = int((df_out["cz_risk"] == "invalid").sum())
    risky = int((df_out["cz_risk"] == "risky").sum())
    valid = int((df_out["cz_risk"] == "valid").sum())
    invalid_rate = round((invalid / total), 4) if total else 0.0
    high_risk_rate = round(((invalid + risky) / total), 4) if total else 0.0

    # Methodology-locked "unreachable" definition (METHODOLOGY.md): hard bounces
    # + role changes + abandoned inboxes + catch-all noise. Buckets are disjoint
    # — each contact is counted in its highest-priority applicable bucket only.
    # Priority order: hard_bounce > catch_all_or_disposable > abandoned_inbox.
    # Role change requires title-shift enrichment and stays `detected: False`.
    HARD_BOUNCE_REASONS = {"empty", "malformed", "syntax"}
    CATCH_ALL_REASONS = {"disposable_domain_hint", "suspicious_structure"}

    hard_bounce_mask = df_out["cz_reason"].isin(HARD_BOUNCE_REASONS)
    catch_all_mask = df_out["cz_reason"].isin(CATCH_ALL_REASONS)
    hard_bounce_count = int(hard_bounce_mask.sum())
    catch_all_count = int(catch_all_mask.sum())

    # Abandoned inbox: we've been emailing the contact and they haven't opened
    # or replied within ABANDONED_INBOX_WINDOW_DAYS. Requires last_send_col plus
    # at least one of last_open_col / last_reply_col — without an engagement
    # signal we can't honestly claim the inbox is abandoned (just stale).
    abandoned_detected = bool(
        last_send_col and last_send_col in df_out.columns and (
            (last_open_col and last_open_col in df_out.columns)
            or (last_reply_col and last_reply_col in df_out.columns)
        )
    )
    abandoned_count = 0

    if abandoned_detected:
        cutoff = pd.Timestamp.utcnow() - pd.Timedelta(days=ABANDONED_INBOX_WINDOW_DAYS)
        last_send_ts = pd.to_datetime(df_out[last_send_col], utc=True, errors="coerce")

        if last_open_col and last_open_col in df_out.columns:
            last_open_ts = pd.to_datetime(df_out[last_open_col], utc=True, errors="coerce")
        else:
            last_open_ts = pd.Series(pd.NaT, index=df_out.index)

        if last_reply_col and last_reply_col in df_out.columns:
            last_reply_ts = pd.to_datetime(df_out[last_reply_col], utc=True, errors="coerce")
        else:
            last_reply_ts = pd.Series(pd.NaT, index=df_out.index)

        has_send = last_send_ts.notna()
        no_recent_open = last_open_ts.isna() | (last_open_ts < cutoff)
        no_recent_reply = last_reply_ts.isna() | (last_reply_ts < cutoff)

        abandoned_mask = has_send & no_recent_open & no_recent_reply
        # Disjointness: a contact already counted as hard_bounce or catch_all
        # cannot also be counted as abandoned.
        abandoned_mask = abandoned_mask & ~hard_bounce_mask & ~catch_all_mask
        abandoned_count = int(abandoned_mask.sum())

    unreachable_total = hard_bounce_count + catch_all_count + abandoned_count
    unreachable_rate = round(unreachable_total / total, 4) if total else 0.0

    def _bucket(count: int, detected: bool, note: str) -> dict:
        return {
            "count": count,
            "rate": round(count / total, 4) if total and detected else 0.0,
            "detected": detected,
            "note": note,
        }

    unreachable_breakdown = {
        "hard_bounce": _bucket(
            hard_bounce_count,
            True,
            "Syntactically dead emails — empty, malformed, or invalid format.",
        ),
        "catch_all_or_disposable": _bucket(
            catch_all_count,
            True,
            "Disposable-domain hints and suspicious local-parts that typically catch-all.",
        ),
        "role_change": _bucket(
            0,
            False,
            "Requires title-shift enrichment (ZoomInfo/Apollo). Connect an enrichment source to detect.",
        ),
        "abandoned_inbox": _bucket(
            abandoned_count,
            abandoned_detected,
            "Contacts with sends on file but no open or reply in 12+ months."
            if abandoned_detected
            else "Requires last_email_send_date plus last_open_date or last_reply_date columns.",
        ),
    }

    # Phone scoring
    phone_invalid = phone_risky = phone_valid = 0
    phone_high_risk_rate = 0.0

    if phone_col and phone_col in df_out.columns:
        phone_risks = [phone_risk(p) for p in df_out[phone_col].tolist()]
        df_out["cz_phone_risk"] = [r[0] for r in phone_risks]
        df_out["cz_phone_reason"] = [r[1] for r in phone_risks]
        phone_invalid = int((df_out["cz_phone_risk"] == "invalid").sum())
        phone_risky = int((df_out["cz_phone_risk"] == "risky").sum())
        phone_valid = int((df_out["cz_phone_risk"] == "valid").sum())
        phone_missing = int((df_out["cz_phone_risk"] == "missing").sum())
        phone_high_risk_rate = round(((phone_invalid + phone_risky) / total), 4) if total else 0.0

    # Combined contact-level risk
    email_flagged = df_out["cz_risk"].isin(["invalid", "risky"])
    if phone_col and phone_col in df_out.columns:
        # missing phones are a completeness issue, not a contact risk flag
        contact_flagged = email_flagged | df_out["cz_phone_risk"].isin(["invalid", "risky"])
    else:
        contact_flagged = email_flagged

    contact_invalid = int(contact_flagged.sum())
    contact_risky = 0  # combined into contact_invalid at the contact level
    contact_valid = total - contact_invalid
    contact_high_risk_rate = round((contact_invalid / total), 4) if total else 0.0

    # Source attribution
    source_breakdown = None
    zoominfo_high_risk_rate = None
    bad_zoominfo_contacts = 0
    zoominfo_flagged_sample = []

    if source_col and source_col in df_out.columns:
        s = df_out[source_col].astype(str).str.lower().fillna("")
        df_out["_cz_source_norm"] = s

        # Rates (existing schema — kept for backwards compat)
        rates = (
            df_out.groupby("_cz_source_norm")["cz_risk"]
            .value_counts(normalize=True)
            .unstack(fill_value=0)
        )
        # Absolute counts so the frontend can rank and attribute dollars
        counts = (
            df_out.groupby("_cz_source_norm")["cz_risk"]
            .value_counts()
            .unstack(fill_value=0)
        )
        totals = df_out.groupby("_cz_source_norm").size().rename("total")

        merged = rates.join(counts.add_prefix("count_")).join(totals).reset_index()
        merged = merged.rename(columns={"_cz_source_norm": "source"})

        rows = []
        for r in merged.to_dict(orient="records"):
            invalid_rate = float(r.get("invalid", 0.0))
            risky_rate = float(r.get("risky", 0.0))
            count_invalid = int(r.get("count_invalid", 0))
            count_risky = int(r.get("count_risky", 0))
            count_valid = int(r.get("count_valid", 0))
            total_for_source = int(r.get("total", 0))
            rows.append({
                "source": r["source"],
                "total": total_for_source,
                "count_invalid": count_invalid,
                "count_risky": count_risky,
                "count_valid": count_valid,
                "count_bad": count_invalid + count_risky,
                "invalid": round(invalid_rate, 4),
                "risky": round(risky_rate, 4),
                "valid": round(float(r.get("valid", 0.0)), 4),
                "unreachable_rate": round(invalid_rate + risky_rate, 4),
            })
        rows.sort(key=lambda x: x["unreachable_rate"], reverse=True)
        source_breakdown = rows

        is_zoominfo = df_out["_cz_source_norm"].str.contains("zoom", na=False)
        if is_zoominfo.any():
            zi = df_out[is_zoominfo]
            zi_flagged = zi[zi["cz_risk"].isin(["invalid", "risky"])]
            bad_zoominfo_contacts = len(zi_flagged)
            zoominfo_high_risk = int(((zi["cz_risk"] == "invalid") | (zi["cz_risk"] == "risky")).sum())
            zoominfo_high_risk_rate = round(zoominfo_high_risk / len(zi), 4) if len(zi) else None

            sample_cols = [c for c in ["first_name", "last_name", "company", "title", email_col, "cz_risk", "cz_reason"] if c in zi_flagged.columns]
            zoominfo_flagged_sample = zi_flagged[sample_cols].head(200).to_dict(orient="records")

    # Completeness and duplicates
    completeness = compute_completeness(df_out, email_col, phone_col)
    dupes = compute_duplicates(df_out, email_col, phone_col)

    # High-risk records sample (for UI display — NOT stored)
    sample_cols = [c for c in ["first_name", "firstname", "last_name", "lastname", "name", email_col, "cz_risk", "cz_reason", "cz_phone_risk", "cz_phone_reason"] if c in df_out.columns]
    high_risk_sample = (
        df_out[df_out["cz_risk"].isin(["invalid", "risky"])][sample_cols]
        .head(500)
        .to_dict(orient="records")
    )

    return {
        "total": total,
        "invalid": invalid,
        "risky": risky,
        "valid": valid,
        "invalid_rate": invalid_rate,
        "high_risk_rate": high_risk_rate,
        "phone_invalid": phone_invalid,
        "phone_risky": phone_risky,
        "phone_valid": phone_valid,
        "phone_missing": phone_missing if phone_col and phone_col in df_out.columns else 0,
        "phone_high_risk_rate": phone_high_risk_rate,
        "contact_invalid": contact_invalid,
        "contact_risky": contact_risky,
        "contact_valid": contact_valid,
        "contact_high_risk_rate": contact_high_risk_rate,
        "unreachable_rate": unreachable_rate,
        "unreachable_breakdown": unreachable_breakdown,
        "source_breakdown": source_breakdown,
        "zoominfo_high_risk_rate": zoominfo_high_risk_rate,
        "bad_zoominfo_contacts": bad_zoominfo_contacts,
        "zoominfo_flagged_sample": zoominfo_flagged_sample,
        "completeness_score": completeness["completeness_score"],
        "field_fill_rates": completeness["field_fill_rates"],
        "email_dupes": dupes["email_dupes"],
        "phone_dupes": dupes["phone_dupes"],
        "high_risk_sample": high_risk_sample,
        # Column guesses for the frontend pre-selection
        "col_guesses": {
            "email": email_col,
            "source": source_col,
            "phone": phone_col,
            "last_send": last_send_col,
            "last_open": last_open_col,
            "last_reply": last_reply_col,
        },
    }


def apply_fixes(
    df: pd.DataFrame,
    email_col: str,
    phone_col: Optional[str],
    fixes: list,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Returns (clean_df, removed_df). Data is never persisted."""
    clean = df.copy()

    if "tag_risky_email" in fixes:
        clean["cz_risky_email"] = clean["cz_risk"] == "risky"

    if "suppress_invalid_email" in fixes:
        clean = clean[clean["cz_risk"] != "invalid"]

    if "suppress_invalid_phone" in fixes and "cz_phone_risk" in clean.columns:
        clean = clean[clean["cz_phone_risk"] != "invalid"]

    if "deduplicate_email" in fixes and email_col in clean.columns:
        emails = clean[email_col].astype(str).str.strip().str.lower()
        clean = clean[~(emails.duplicated(keep="first") & ~emails.isin(["", "nan"]))]

    if "flag_enrichment" in fixes:
        key_fields = [
            c for c in ["first_name", "firstname", "last_name", "lastname",
                         "company", "title", "job_title"]
            if c in clean.columns
        ]
        if key_fields:
            needs = (
                clean[key_fields].astype(str)
                .replace("nan", "").replace("", pd.NA)
                .isnull().any(axis=1)
            )
            clean["cz_needs_enrichment"] = needs

    removed = df[~df.index.isin(clean.index)].copy()
    return clean, removed
