import re
from dataclasses import dataclass
from typing import List, Optional, Tuple

import pandas as pd
import streamlit as st
from email_validator import validate_email, EmailNotValidError


# ----------------------------
# ROI Model
# ----------------------------

@dataclass
class ROIInputs:
    number_of_reps: int
    emails_per_rep_per_week: int
    new_contacts_per_rep_per_week: int
    invalid_email_rate: float
    risky_new_contact_rate: float
    cleanup_hours_per_rep_per_month: float
    rep_hourly_cost: float
    annual_data_cost: float
    confidence_factor: float


def calc_roi(inputs: ROIInputs) -> dict:
    annual_rep_cleanup_hours = inputs.number_of_reps * inputs.cleanup_hours_per_rep_per_month * 12
    rep_productivity_loss = annual_rep_cleanup_hours * inputs.rep_hourly_cost
    annual_emails_sent = inputs.number_of_reps * inputs.emails_per_rep_per_week * 52
    wasted_emails = int(round(annual_emails_sent * inputs.invalid_email_rate))
    estimated_data_waste = inputs.annual_data_cost * inputs.risky_new_contact_rate * inputs.confidence_factor
    total_annual_impact = rep_productivity_loss + estimated_data_waste
    return {
        "annual_rep_cleanup_hours": annual_rep_cleanup_hours,
        "rep_productivity_loss": rep_productivity_loss,
        "annual_emails_sent": annual_emails_sent,
        "wasted_emails": wasted_emails,
        "estimated_data_waste": estimated_data_waste,
        "total_annual_impact": total_annual_impact,
    }


# ----------------------------
# Scoring
# ----------------------------

DISPOSABLE_DOMAIN_HINTS = {
    "mailinator", "guerrillamail", "10minutemail", "temp-mail", "yopmail"
}


def normalize_col(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = [c.strip().lower() for c in df.columns]
    return df


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


def normalize_phone(phone) -> str:
    if phone is None:
        return ""
    return re.sub(r"\D", "", str(phone))


def phone_risk(phone) -> Tuple[str, str]:
    if phone is None or str(phone).strip() == "" or str(phone).lower() == "nan":
        return "risky", "missing_phone"
    digits = normalize_phone(phone)
    if len(digits) < 10:
        return "invalid", "invalid_phone"
    toll_free_prefixes = ("800", "888", "877", "866", "855", "844", "833", "822")
    if digits.startswith(toll_free_prefixes):
        return "risky", "shared_or_main_line_suspected"
    return "valid", "phone_ok"


def email_risk(email) -> Tuple[str, str]:
    if email is None:
        return "invalid", "empty"
    email = str(email).strip()
    if email == "" or email.lower() == "nan":
        return "invalid", "empty"
    if " " in email or email.count("@") != 1:
        return "invalid", "malformed"
    try:
        v = validate_email(email, check_deliverability=False)
        normalized = v.email
    except EmailNotValidError:
        return "invalid", "syntax"
    domain = normalized.split("@")[-1].lower()
    for hint in DISPOSABLE_DOMAIN_HINTS:
        if hint in domain:
            return "risky", "disposable_domain_hint"
    local = normalized.split("@")[0]
    if len(local) < 2 or len(domain) < 4:
        return "risky", "suspicious_structure"
    return "valid", "syntax_ok"


# ----------------------------
# Analysis
# ----------------------------

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
        field_fill_rates[label] = int(filled) / total if total else 0.0

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
    source_col: Optional[str],
    phone_col: Optional[str] = None,
) -> dict:
    # Email scoring
    emails = df[email_col].astype(str).fillna("").tolist()
    risks = [email_risk(e) for e in emails]
    df_out = df.copy()
    df_out["cz_risk"] = [r[0] for r in risks]
    df_out["cz_reason"] = [r[1] for r in risks]

    total = len(df_out)
    invalid = int((df_out["cz_risk"] == "invalid").sum())
    risky = int((df_out["cz_risk"] == "risky").sum())
    valid = int((df_out["cz_risk"] == "valid").sum())
    invalid_rate = (invalid / total) if total else 0.0
    high_risk_rate = ((invalid + risky) / total) if total else 0.0

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
        phone_high_risk_rate = ((phone_invalid + phone_risky) / total) if total else 0.0

    # Combined contact-level risk (email OR phone flagged)
    email_flagged = df_out["cz_risk"].isin(["invalid", "risky"])
    if phone_col and phone_col in df_out.columns:
        contact_flagged = email_flagged | df_out["cz_phone_risk"].isin(["invalid", "risky"])
    else:
        contact_flagged = email_flagged

    contact_invalid = int(contact_flagged.sum())
    contact_risky = 0
    contact_valid = total - contact_invalid
    contact_high_risk_rate = (contact_invalid / total) if total else 0.0

    # Source attribution
    source_breakdown = None
    zoominfo_high_risk_rate = None
    zoominfo_flagged_df = pd.DataFrame()
    bad_zoominfo_contacts = 0

    if source_col and source_col in df_out.columns:
        s = df_out[source_col].astype(str).str.lower().fillna("")
        df_out["_cz_source_norm"] = s
        grp = df_out.groupby("_cz_source_norm")["cz_risk"].value_counts(normalize=True).unstack(fill_value=0)
        source_breakdown = grp.reset_index().rename(columns={"_cz_source_norm": "source_norm"})

        is_zoominfo = df_out["_cz_source_norm"].str.contains("zoom", na=False)
        if is_zoominfo.any():
            zi = df_out[is_zoominfo].copy()
            zoominfo_flagged_df = zi[zi["cz_risk"].isin(["invalid", "risky"])].copy()
            bad_zoominfo_contacts = len(zoominfo_flagged_df)
            zoominfo_high_risk = int(((zi["cz_risk"] == "invalid") | (zi["cz_risk"] == "risky")).sum())
            zoominfo_high_risk_rate = zoominfo_high_risk / len(zi) if len(zi) else None

    # Completeness and duplicates
    completeness = compute_completeness(df_out, email_col, phone_col)
    dupes = compute_duplicates(df_out, email_col, phone_col)

    return {
        "df_scanned": df_out,
        "total": total,
        "invalid": invalid,
        "risky": risky,
        "valid": valid,
        "invalid_rate": invalid_rate,
        "high_risk_rate": high_risk_rate,
        "phone_invalid": phone_invalid,
        "phone_risky": phone_risky,
        "phone_valid": phone_valid,
        "phone_high_risk_rate": phone_high_risk_rate,
        "contact_invalid": contact_invalid,
        "contact_risky": contact_risky,
        "contact_valid": contact_valid,
        "contact_high_risk_rate": contact_high_risk_rate,
        "source_breakdown": source_breakdown,
        "zoominfo_high_risk_rate": zoominfo_high_risk_rate,
        "zoominfo_flagged_df": zoominfo_flagged_df,
        "bad_zoominfo_contacts": bad_zoominfo_contacts,
        "completeness_score": completeness["completeness_score"],
        "field_fill_rates": completeness["field_fill_rates"],
        "email_dupes": dupes["email_dupes"],
        "phone_dupes": dupes["phone_dupes"],
    }


# ----------------------------
# Helpers
# ----------------------------

def format_pct(x: float) -> str:
    return f"{x * 100:.1f}%"


def get_recommended_actions(scan: dict, roi: dict) -> List[dict]:
    actions = []

    if scan["contact_high_risk_rate"] > 0.30:
        actions.append({
            "level": "error",
            "action": f"Suppress {scan['contact_invalid']:,} at-risk contacts before the next sequence run",
            "why": f"{format_pct(scan['contact_high_risk_rate'])} of your database is invalid or risky — actively degrading deliverability and burning rep time.",
        })
    elif scan["contact_high_risk_rate"] > 0.10:
        actions.append({
            "level": "warning",
            "action": f"Review and suppress {scan['contact_invalid']:,} at-risk contacts",
            "why": f"{format_pct(scan['contact_high_risk_rate'])} contact risk rate detected. Suppression improves sequence efficiency and sender reputation.",
        })

    if scan.get("zoominfo_high_risk_rate") and scan["zoominfo_high_risk_rate"] > 0.20:
        actions.append({
            "level": "error",
            "action": f"Request ZoomInfo credit recapture for {scan['bad_zoominfo_contacts']:,} flagged contacts",
            "why": f"{format_pct(scan['zoominfo_high_risk_rate'])} of ZoomInfo-sourced contacts are invalid or risky. Most vendors offer credits for provably bad records.",
        })

    if scan["phone_high_risk_rate"] > 0.25:
        actions.append({
            "level": "warning",
            "action": f"Enrich or remove {scan['phone_invalid'] + scan['phone_risky']:,} contacts with unusable phone data",
            "why": f"{format_pct(scan['phone_high_risk_rate'])} of phone records are missing, invalid, or suspected shared lines — hurting direct dial connect rates.",
        })

    if scan.get("email_dupes", 0) > 50:
        actions.append({
            "level": "warning",
            "action": f"Deduplicate {scan['email_dupes']:,} records sharing a duplicate email address",
            "why": "Duplicate contacts inflate enrollment counts, split engagement history, and waste sequence budget.",
        })

    if scan.get("completeness_score", 100) < 70:
        actions.append({
            "level": "warning",
            "action": "Enrich contact records to improve field completeness",
            "why": f"Overall data completeness is {scan['completeness_score']}/100. Gaps in name, company, and title reduce personalization effectiveness.",
        })

    if roi["total_annual_impact"] > 25000:
        actions.append({
            "level": "info",
            "action": "Share this report with sales leadership to establish a data hygiene SLA",
            "why": f"Estimated ${roi['total_annual_impact']:,.0f} annual impact from data decay. Executive visibility accelerates action.",
        })

    return actions


# ----------------------------
# Fix Execution Engine
# ----------------------------

def apply_fixes(
    df_scanned: pd.DataFrame,
    email_col: str,
    phone_col: Optional[str],
    fixes: List[str],
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """Apply selected fixes to the scanned dataframe.
    Returns (clean_df, removed_df).
    """
    df = df_scanned.copy()

    if "suppress_risky_email" in fixes:
        df = df[~df["cz_risk"].isin(["invalid", "risky"])]
    elif "suppress_invalid_email" in fixes:
        df = df[df["cz_risk"] != "invalid"]

    if "suppress_invalid_phone" in fixes and "cz_phone_risk" in df.columns:
        df = df[df["cz_phone_risk"] != "invalid"]

    if "deduplicate_email" in fixes and email_col in df.columns:
        emails = df[email_col].astype(str).str.strip().str.lower()
        df = df[~(emails.duplicated(keep="first") & ~emails.isin(["", "nan"]))]

    if "flag_enrichment" in fixes:
        key_fields = [
            c for c in ["first_name", "firstname", "last_name", "lastname", "company",
                         "title", "job_title", "jobtitle"]
            if c in df.columns
        ]
        if key_fields:
            needs = (
                df[key_fields].astype(str)
                .replace("nan", "").replace("", pd.NA)
                .isnull().any(axis=1)
            )
            df["cz_needs_enrichment"] = needs

    removed_df = df_scanned[~df_scanned.index.isin(df.index)].copy()
    return df, removed_df


# ----------------------------
# Render Functions
# ----------------------------

def render_recommended_actions(actions: List[dict]) -> None:
    if not actions:
        st.success("No critical actions detected. Data quality looks healthy.")
        return

    st.subheader("Recommended Actions")
    st.caption("Priority actions based on your scan results.")

    renderers = {"error": st.error, "warning": st.warning, "info": st.info}
    for item in actions:
        fn = renderers.get(item["level"], st.info)
        fn(f"**{item['action']}** — {item['why']}")


def render_executive_tab(scan: dict, roi: dict, number_of_reps: int) -> None:
    health_score = int(max(0, min(100, round(100 - (scan["contact_high_risk_rate"] * 100)))))
    if health_score >= 90:
        health_status = "Healthy"
    elif health_score >= 75:
        health_status = "Moderate Risk"
    elif health_score >= 50:
        health_status = "High Risk"
    else:
        health_status = "Critical"

    st.warning(
        f"**{scan['contact_invalid'] + scan['contact_risky']:,} at-risk contacts detected** "
        f"({format_pct(scan['contact_high_risk_rate'])} of the database)"
    )

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Database Health", f"{health_score}/100", health_status)
    c2.metric("Contact Risk Rate", format_pct(scan["contact_high_risk_rate"]))
    c3.metric("Est. Annual Impact", f"${roi['total_annual_impact']:,.0f}")
    c4.metric("Wasted Emails (Est.)", f"{roi['wasted_emails']:,}")

    st.divider()

    p1, p2, p3, p4 = st.columns(4)
    p1.metric("Email Risk Rate", format_pct(scan["high_risk_rate"]))
    p2.metric("Phone Risk Rate", format_pct(scan["phone_high_risk_rate"]))
    p3.metric("Data Completeness", f"{scan['completeness_score']}/100")
    p4.metric("Duplicate Records", f"{scan['email_dupes']:,}")

    st.success(f"**{scan['contact_valid']:,}** contacts are valid and usable.")

    if scan["phone_invalid"] + scan["phone_risky"] > 0:
        st.write(
            f"Phone review identified **{scan['phone_invalid'] + scan['phone_risky']:,} risky or unusable phone records**, "
            f"including missing numbers, invalid formats, and suspected shared lines."
        )

    st.divider()

    actions = get_recommended_actions(scan, roi)
    render_recommended_actions(actions)

    st.divider()

    if not scan.get("zoominfo_flagged_df", pd.DataFrame()).empty:
        st.markdown("### ZoomInfo Recovery Opportunity")
        st.write(
            "These ZoomInfo-sourced contacts were flagged as invalid or risky "
            "and may qualify for vendor credit recapture."
        )
        preview_cols = [
            c for c in ["first_name", "last_name", "company", "title", "email", "cz_risk", "cz_reason"]
            if c in scan["zoominfo_flagged_df"].columns
        ]
        st.dataframe(scan["zoominfo_flagged_df"][preview_cols].head(200), use_container_width=True, hide_index=True)
        st.download_button(
            "Export ZoomInfo Recovery List",
            data=scan["zoominfo_flagged_df"].to_csv(index=False).encode("utf-8"),
            file_name="contactzen_zoominfo_recovery_list.csv",
            mime="text/csv",
        )
        st.divider()

    st.subheader("Org-Wide Revenue Exposure")
    st.caption("Uses the sidebar assumptions to estimate how contact decay affects pipeline across your sales org.")

    avg_pipeline_per_rep = st.number_input(
        "Avg Pipeline Generated per Rep ($)", min_value=0, value=250000, step=25000
    )
    pipeline_at_risk = int(number_of_reps * avg_pipeline_per_rep * scan["high_risk_rate"])

    o1, o2, o3 = st.columns(3)
    o1.metric("Sales Reps", f"{number_of_reps:,}")
    o2.metric("Avg Pipeline / Rep", f"${avg_pipeline_per_rep:,.0f}")
    o3.metric("Pipeline at Risk", f"${pipeline_at_risk:,.0f}")

    st.markdown(f"""
**How this works:** {number_of_reps:,} reps × ${avg_pipeline_per_rep:,.0f} avg pipeline × {format_pct(scan['high_risk_rate'])} contact decay rate = **${pipeline_at_risk:,.0f}** of pipeline potentially exposed to bad data.
""")


def render_revops_tab(scan: dict, df_scanned: pd.DataFrame) -> None:
    st.subheader("Where GTM Waste Comes From")

    reason_map = {
        "empty": "Missing Email Address",
        "malformed": "Broken Email Format",
        "syntax": "Invalid Email",
        "disposable_domain_hint": "Temporary / Fake Email",
        "suspicious_structure": "Suspicious Email",
        "missing_phone": "Missing Phone",
        "invalid_phone": "Invalid Phone Number",
        "shared_or_main_line_suspected": "Shared / Main Line",
    }

    reasons = df_scanned["cz_reason"].astype(str).str.lower()
    labels = reasons.map(lambda r: reason_map.get(r, "Other"))
    top = labels.value_counts().head(10).reset_index()
    top.columns = ["Issue", "Count"]

    left, right = st.columns([1, 1])
    with left:
        st.write("**Top data quality issues detected**")
        st.dataframe(top, use_container_width=True, hide_index=True)
    with right:
        st.write("**Why it matters**")
        st.markdown(
            "- Invalid emails create hard bounces and damage sender reputation.\n"
            "- Missing or bad phones kill direct dial connect rates.\n"
            "- Bad records still consume rep time, CRM storage, and paid data budget.\n"
            "- Duplicates inflate activity metrics without generating real pipeline."
        )

    st.divider()

    st.subheader("Field Completeness")
    st.caption("Percentage of contacts with each key field populated.")

    if scan.get("field_fill_rates"):
        fill_df = pd.DataFrame([
            {
                "Field": field,
                "Filled": f"{rate * 100:.1f}%",
                "Missing Records": f"{int((1 - rate) * scan['total']):,}",
            }
            for field, rate in scan["field_fill_rates"].items()
        ])
        st.dataframe(fill_df, use_container_width=True, hide_index=True)
        st.caption(f"Overall completeness score: **{scan['completeness_score']}/100**")
    else:
        st.write("No key fields detected in the uploaded file.")

    st.divider()

    st.subheader("Duplicate Records")
    d1, d2 = st.columns(2)
    d1.metric("Duplicate Emails", f"{scan['email_dupes']:,}")
    d2.metric("Duplicate Phone Numbers", f"{scan['phone_dupes']:,}")
    if scan["email_dupes"] > 0 or scan["phone_dupes"] > 0:
        st.caption(
            "Duplicates inflate CRM contact counts, split engagement history, and waste sequence budget. "
            "Deduplicate in your CRM before the next outreach run."
        )

    st.divider()

    st.subheader("Source Quality Breakdown")
    if scan.get("source_breakdown") is not None:
        source_df = scan["source_breakdown"].copy()
        for col in ["invalid", "risky", "valid"]:
            if col in source_df.columns:
                source_df[col] = (source_df[col] * 100).round(1).astype(str) + "%"
        st.dataframe(source_df, use_container_width=True, hide_index=True)
        if scan.get("zoominfo_high_risk_rate") is not None:
            st.info(
                f"ZoomInfo high-risk rate (invalid + risky): **{format_pct(scan['zoominfo_high_risk_rate'])}**"
            )
    else:
        st.write("No source column selected. Add one to compare vendor quality side-by-side.")


def render_records_tab(df_scanned: pd.DataFrame, email_col: str) -> None:
    st.subheader("High-Risk Records")

    high_risk = df_scanned[df_scanned["cz_risk"].isin(["invalid", "risky"])].copy().head(500)
    preferred_cols = [
        "first_name", "firstname", "last_name", "lastname", "name",
        email_col, "cz_risk", "cz_reason", "cz_phone_risk", "cz_phone_reason",
    ]
    show_cols = [c for c in preferred_cols if c in high_risk.columns]
    st.dataframe(high_risk[show_cols], use_container_width=True, hide_index=True)

    st.divider()
    st.subheader("Export")
    col1, col2 = st.columns(2)
    with col1:
        st.download_button(
            "Download Full Scanned CSV",
            data=df_scanned.to_csv(index=False).encode("utf-8"),
            file_name="contactzen_scanned.csv",
            mime="text/csv",
        )
    with col2:
        high_risk_export = df_scanned[df_scanned["cz_risk"].isin(["invalid", "risky"])]
        st.download_button(
            "Download High-Risk Records Only",
            data=high_risk_export.to_csv(index=False).encode("utf-8"),
            file_name="contactzen_high_risk.csv",
            mime="text/csv",
        )


def render_actions_tab(scan: dict, roi: dict, email_col: str, phone_col: Optional[str]) -> None:
    has_phone = "cz_phone_risk" in scan["df_scanned"].columns

    st.subheader("Apply Data Fixes")
    st.caption(
        "Select the fixes to apply. ContactZen will generate a clean contact list "
        "and a suppression list you can import directly into your CRM or sequencer."
    )

    with st.form("fix_form"):
        st.markdown("**Choose what to fix:**")

        cb_invalid = st.checkbox(
            f"Remove invalid emails — {scan['invalid']:,} contacts",
            value=True,
            help="Removes contacts with empty, malformed, or syntactically invalid email addresses.",
        )
        cb_risky = st.checkbox(
            f"Also remove risky emails — {scan['risky']:,} additional contacts",
            value=False,
            help="Removes contacts with disposable domains or suspicious email structures. More aggressive.",
        )
        cb_phone = st.checkbox(
            f"Remove invalid phone numbers — {scan['phone_invalid']:,} contacts"
            if has_phone else "Remove invalid phone numbers (no phone column selected)",
            value=False,
            disabled=not has_phone,
            help="Removes contacts where the phone number is clearly malformed or too short to be real.",
        )
        cb_dedup = st.checkbox(
            f"Deduplicate by email — {scan['email_dupes']:,} duplicate records",
            value=scan["email_dupes"] > 0,
            help="Keeps the first occurrence of each email address and removes the rest.",
        )
        cb_enrich = st.checkbox(
            "Flag contacts needing enrichment (adds a column, does not remove)",
            value=False,
            help="Adds a cz_needs_enrichment column to contacts missing name, company, or title.",
        )

        submitted = st.form_submit_button("Apply Fixes & Generate Clean Dataset", type="primary")

    if submitted:
        fixes = []
        if cb_risky:
            fixes.append("suppress_risky_email")
        elif cb_invalid:
            fixes.append("suppress_invalid_email")
        if cb_phone:
            fixes.append("suppress_invalid_phone")
        if cb_dedup:
            fixes.append("deduplicate_email")
        if cb_enrich:
            fixes.append("flag_enrichment")

        with st.spinner("Applying fixes..."):
            clean_df, removed_df = apply_fixes(scan["df_scanned"], email_col, phone_col, fixes)

        st.session_state.cleaned_df = clean_df
        st.session_state.removed_df = removed_df
        st.session_state.applied_fixes = fixes

    clean_df = st.session_state.get("cleaned_df")
    removed_df = st.session_state.get("removed_df", pd.DataFrame())

    if clean_df is not None:
        st.divider()
        st.subheader("Results")

        r1, r2, r3 = st.columns(3)
        removed_count = scan["total"] - len(clean_df)
        r1.metric("Original Contacts", f"{scan['total']:,}")
        r2.metric("Clean Contacts", f"{len(clean_df):,}")
        r3.metric("Removed / Suppressed", f"{removed_count:,}")

        st.success(
            f"Clean dataset ready — **{len(clean_df):,}** contacts remain. "
            f"**{removed_count:,}** contacts moved to suppression list."
        )

        dl1, dl2 = st.columns(2)
        with dl1:
            st.download_button(
                "Download Clean Contact List",
                data=clean_df.to_csv(index=False).encode("utf-8"),
                file_name="contactzen_clean.csv",
                mime="text/csv",
                type="primary",
            )
        with dl2:
            if not removed_df.empty:
                st.download_button(
                    "Download Suppression List",
                    data=removed_df.to_csv(index=False).encode("utf-8"),
                    file_name="contactzen_suppression.csv",
                    mime="text/csv",
                )

        if not removed_df.empty:
            st.divider()
            st.subheader(f"Removed Records — {len(removed_df):,} contacts")
            preferred_cols = [
                "first_name", "last_name", "company", email_col,
                "cz_risk", "cz_reason", "cz_phone_risk",
            ]
            show_cols = [c for c in preferred_cols if c in removed_df.columns]
            st.dataframe(removed_df[show_cols].head(200), use_container_width=True, hide_index=True)

    st.divider()
    st.subheader("Making This Ongoing")
    st.markdown("""
A one-time fix is a start. The real value is continuous protection — catching bad data before it reaches reps.

**What ongoing hygiene looks like:**

- **Automated scans** — run weekly against your live HubSpot or Salesforce data, no CSV required
- **Pre-sequence protection** — flag or suppress risky contacts before they're enrolled in outreach
- **New contact monitoring** — score contacts the moment they enter your CRM
- **Vendor accountability** — track data quality by source over time; build a paper trail for ZoomInfo and Apollo credit recapture
- **Push suppressions back to HubSpot** — apply your clean list and risk scores as contact properties, directly in HubSpot

**The next step is a HubSpot API connection.** Once connected, everything you just did happens automatically — no exports, no uploads, no manual process.
""")
    st.info(
        "HubSpot integration is coming next. You'll pull live contacts, push risk scores as contact properties, "
        "and schedule scans — all without leaving ContactZen."
    )


# ----------------------------
# App / UI
# ----------------------------

st.set_page_config(
    page_title="ContactZen",
    page_icon="🔮",
    layout="wide",
)

st.markdown("""
<style>
[data-testid="stMetricValue"] { color: #7C3AED; font-weight: 700; }
.stDownloadButton > button { border-radius: 8px; }
</style>
""", unsafe_allow_html=True)

st.markdown("""
<div style="display:flex;align-items:center;gap:14px;padding:4px 0 20px 0;">
  <div style="background:linear-gradient(135deg,#7C3AED,#9F67FF);color:white;font-size:22px;width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 14px rgba(124,58,237,0.35);">⚡</div>
  <div>
    <div style="font-size:32px;font-weight:800;color:#1E1B4B;line-height:1.1;letter-spacing:-0.5px;">ContactZen</div>
    <div style="font-size:14px;color:#7C3AED;font-weight:500;margin-top:3px;">Contact Data Intelligence Platform</div>
  </div>
</div>
""", unsafe_allow_html=True)

st.caption("Upload a CRM contact export (HubSpot, Salesforce, Apollo, etc.) to scan for bad data, quantify business impact, and surface what to do next.")

# Session state
for key in ["scan", "roi", "email_col", "source_col", "phone_col", "df_uploaded",
            "cleaned_df", "removed_df", "applied_fixes"]:
    if key not in st.session_state:
        st.session_state[key] = None

# Sidebar
with st.sidebar:
    st.markdown("### ROI Assumptions")
    rep_hourly_cost = st.number_input("Fully Loaded Rep Cost / Hour ($)", min_value=10.0, max_value=250.0, value=50.0, step=5.0)
    cleanup_hours_per_rep_per_month = st.number_input("Manual Cleanup Hours / Rep / Month", min_value=0.0, max_value=40.0, value=2.0, step=0.5)
    confidence_factor = st.slider("Confidence Factor", min_value=0.0, max_value=1.0, value=0.5, step=0.05)
    st.divider()
    st.markdown("### Sales Org Inputs")
    number_of_reps = st.number_input("Number of Reps", min_value=1, max_value=5000, value=25, step=1)
    emails_per_rep_per_week = st.number_input("Emails / Rep / Week", min_value=0, max_value=5000, value=200, step=25)
    new_contacts_per_rep_per_week = st.number_input("New Contacts / Rep / Week", min_value=0, max_value=2000, value=50, step=5)
    annual_data_cost = st.number_input("Annual Data Provider Cost ($)", min_value=0.0, max_value=5000000.0, value=18000.0, step=500.0)

# Upload
st.subheader("1. Upload Contacts CSV")
st.caption("Export directly from HubSpot, Salesforce, or Apollo. Include email, phone, and a source/lead source column for the best results.")
uploaded = st.file_uploader("Upload CSV", type=["csv"], label_visibility="collapsed")

if uploaded is not None:
    try:
        df = pd.read_csv(uploaded)
    except Exception:
        uploaded.seek(0)
        df = pd.read_csv(uploaded, encoding="latin-1")

    df = normalize_col(df)
    st.session_state.df_uploaded = df.copy()
    st.write(f"Loaded **{len(df):,}** contacts · **{len(df.columns)}** columns")

    email_col_guess = guess_email_col(df)
    source_col_guess = guess_source_col(df)
    phone_col_guess = guess_phone_col(df)

    c1, c2, c3 = st.columns(3)
    with c1:
        email_col = st.selectbox(
            "Email column",
            options=list(df.columns),
            index=(list(df.columns).index(email_col_guess) if email_col_guess in df.columns else 0),
            key="email_col_select",
        )
    with c2:
        source_col = st.selectbox(
            "Source column (optional)",
            options=["(none)"] + list(df.columns),
            index=(1 + list(df.columns).index(source_col_guess) if source_col_guess in df.columns else 0),
            key="source_col_select",
        )
    with c3:
        phone_col = st.selectbox(
            "Phone column (optional)",
            options=["(none)"] + list(df.columns),
            index=(1 + list(df.columns).index(phone_col_guess) if phone_col_guess in df.columns else 0),
            key="phone_col_select",
        )

    source_col = None if source_col == "(none)" else source_col
    phone_col = None if phone_col == "(none)" else phone_col

    st.subheader("2. Run Scan")
    if st.button("Run ContactZen Scan", type="primary"):
        with st.spinner("Scanning contacts and scoring risk..."):
            scan = compute_scan(df, email_col=email_col, source_col=source_col, phone_col=phone_col)

        roi_inputs = ROIInputs(
            number_of_reps=int(number_of_reps),
            emails_per_rep_per_week=int(emails_per_rep_per_week),
            new_contacts_per_rep_per_week=int(new_contacts_per_rep_per_week),
            invalid_email_rate=float(scan["invalid_rate"]),
            risky_new_contact_rate=float(scan["high_risk_rate"]),
            cleanup_hours_per_rep_per_month=float(cleanup_hours_per_rep_per_month),
            rep_hourly_cost=float(rep_hourly_cost),
            annual_data_cost=float(annual_data_cost),
            confidence_factor=float(confidence_factor),
        )
        roi = calc_roi(roi_inputs)

        st.session_state.scan = scan
        st.session_state.roi = roi
        st.session_state.email_col = email_col
        st.session_state.source_col = source_col
        st.session_state.phone_col = phone_col
        # Clear any previous fix results when a new scan runs
        st.session_state.cleaned_df = None
        st.session_state.removed_df = None
        st.session_state.applied_fixes = None
        st.success("Scan complete.")

    if st.session_state.scan is not None and st.session_state.roi is not None:
        scan = st.session_state.scan
        roi = st.session_state.roi
        email_col = st.session_state.email_col
        phone_col = st.session_state.phone_col

        tab1, tab2, tab3, tab4 = st.tabs([
            "Executive Summary",
            "RevOps Breakdown",
            "At-Risk Records",
            "Fix & Export",
        ])

        with tab1:
            render_executive_tab(scan, roi, number_of_reps)
        with tab2:
            render_revops_tab(scan, scan["df_scanned"])
        with tab3:
            render_records_tab(scan["df_scanned"], email_col)
        with tab4:
            render_actions_tab(scan, roi, email_col, phone_col)
