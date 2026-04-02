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


def compute_scan(
    df: pd.DataFrame,
    email_col: str,
    source_col: Optional[str] = None,
    phone_col: Optional[str] = None,
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
        grp = (
            df_out.groupby("_cz_source_norm")["cz_risk"]
            .value_counts(normalize=True)
            .unstack(fill_value=0)
            .reset_index()
            .rename(columns={"_cz_source_norm": "source"})
        )
        source_breakdown = grp.to_dict(orient="records")

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
