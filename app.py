import re
from dataclasses import dataclass
from typing import Optional, Tuple

import pandas as pd
import streamlit as st
from email_validator import validate_email, EmailNotValidError

from datetime import date, timedelta
# ----------------------------
# ROI Model
# ----------------------------

@dataclass
class ROIInputs:
    number_of_reps: int
    emails_per_rep_per_week: int
    new_contacts_per_rep_per_week: int
    invalid_email_rate: float  # 0-1
    risky_new_contact_rate: float  # 0-1
    cleanup_hours_per_rep_per_month: float
    rep_hourly_cost: float
    annual_data_cost: float
    confidence_factor: float  # 0-1


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
# Email Risk Scoring (MVP)
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

def email_risk(email: str) -> Tuple[str, str]:
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

def compute_scan(df: pd.DataFrame, email_col: str, source_col: Optional[str]) -> dict:
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

    return {        
        "zoominfo_flagged_df": zoominfo_flagged_df,
        "bad_zoominfo_contacts": bad_zoominfo_contacts,
        "df_scanned": df_out,
        "total": total,
        "invalid": invalid,
        "risky": risky,
        "valid": valid,
        "invalid_rate": invalid_rate,
        "high_risk_rate": high_risk_rate,
        "source_breakdown": source_breakdown,
        "zoominfo_high_risk_rate": zoominfo_high_risk_rate,
    }
def format_pct(x: float) -> str:
    return f"{x*100:.1f}%"

def render_executive_tab(scan: dict, roi: dict, number_of_reps: int) -> None:
    st.subheader("Executive Summary")

    health_score = int(max(0, min(100, round(100 - (scan["high_risk_rate"] * 100)))))

    st.markdown("""
### ContactZen helps revenue teams find bad contact data, measure its impact, and take action before it wastes rep time, paid data spend, and pipeline opportunity.
""")

    st.warning(
        f"{scan['invalid'] + scan['risky']:,} at-risk contacts detected "
        f"({format_pct(scan['high_risk_rate'])} of the database)"
    )

    st.write(
        f"Estimated annual business impact: **${roi['total_annual_impact']:,.0f}** "
        f"from manual cleanup effort, wasted outreach, and low-quality paid-data records."
    )

    st.success(f"{scan['valid']:,} contacts were classified as valid and usable.")
    if health_score >= 90:
        health_status = "Healthy"
    elif health_score >= 75:
        health_status = "Moderate Risk"
    elif health_score >= 50:
        health_status = "High Risk"
    else:
        health_status = "Critical"

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Database Health", f"{health_score}/100", health_status)
    c2.metric("Decay Rate (High Risk)", format_pct(scan["high_risk_rate"]))
    c3.metric("Estimated Annual Impact", f"${roi['total_annual_impact']:,.0f}")
    c4.metric("Wasted Emails (Est.)", f"{roi['wasted_emails']:,}")
    st.divider()
    if not scan.get("zoominfo_flagged_df", pd.DataFrame()).empty:
        st.markdown("### ZoomInfo Recovery Opportunity")
        st.write("These ZoomInfo-sourced contacts were flagged as invalid or risky and may be worth reviewing for vendor credit recapture.")

        preview_cols = [c for c in ["first_name", "last_name", "company", "title", "email", "cz_risk", "cz_reason"] if c in scan["zoominfo_flagged_df"].columns]
        st.dataframe(
            scan["zoominfo_flagged_df"][preview_cols].head(200),
            use_container_width=True,
            hide_index=True,
        )

        st.download_button(
            "Export ZoomInfo Recovery List",
            data=scan["zoominfo_flagged_df"].to_csv(index=False).encode("utf-8"),
            file_name="contactzen_zoominfo_recovery_list.csv",
            mime="text/csv",
        )
    st.divider()
    st.subheader("Org-Wide Revenue Exposure")

    st.caption(
        "This estimate uses the editable assumptions in the left sidebar to show how contact decay may affect revenue generation across the sales organization."
    )

    avg_pipeline_per_rep = st.number_input(
        "Avg Pipeline Generated per Rep ($)",
        min_value=0,
        value=250000,
        step=25000,
    )

    pipeline_at_risk = int(number_of_reps * avg_pipeline_per_rep * scan["high_risk_rate"])

    o1, o2, o3 = st.columns(3)
    o1.metric("Sales Reps Included", f"{number_of_reps:,}")
    o2.metric("Avg Pipeline per Rep", f"${avg_pipeline_per_rep:,.0f}")
    o3.metric("Estimated Pipeline at Risk", f"${pipeline_at_risk:,.0f}")

    st.markdown(f"""
**How this estimate works**
- Sales reps included: **{number_of_reps:,}**
- Avg pipeline per rep: **${avg_pipeline_per_rep:,.0f}**
- Contact decay rate detected by ContactZen: **{format_pct(scan['high_risk_rate'])}**

That implies roughly **${pipeline_at_risk:,.0f}** of pipeline may be exposed to poor contact data quality across the organization.
""")
def render_revops_tab(scan: dict, df_scanned) -> None:
    st.subheader("Where GTM Waste Comes From")

    reason_map = {
        "empty": "Missing Email Address",
        "malformed": "Broken Email Format",
        "syntax": "Invalid Email",
        "disposable_domain_hint": "Temporary / Fake Email",
        "suspicious_structure": "Suspicious Email",
    }

    reasons = df_scanned["cz_reason"].astype(str).str.lower()
    labels = reasons.map(lambda r: reason_map.get(r, "Needs Review"))

    top = labels.value_counts().head(8).reset_index()
    top.columns = ["Issue", "Count"]

    left, right = st.columns([1, 1])

    with left:
        st.write("**Top data quality issues detected**")
        st.dataframe(top, use_container_width=True, hide_index=True)

        

    with right:
        st.write("**Why it matters**")
        st.markdown(
    "- Invalid emails waste outbound effort and create hard bounces.\n"
    "- Low-quality contact data reduces connect rates and pipeline efficiency.\n"
    "- Missing or risky records still consume rep time, CRM space, and paid data spend."
)
        

    st.divider()

    st.subheader("Source Quality and Recommended Action")

    if scan.get("source_breakdown") is not None:
        source_df = scan["source_breakdown"].copy()

        for col in ["invalid", "risky", "valid"]:
            if col in source_df.columns:
                source_df[col] = (source_df[col] * 100).round(1).astype(str) + "%"

        st.dataframe(source_df, use_container_width=True)

        if scan.get("zoominfo_high_risk_rate") is not None:
            st.info(
                f"ZoomInfo high-risk rate (invalid+risky): **{format_pct(scan['zoominfo_high_risk_rate'])}**"
            )
    else:
        st.write("No source column selected. Add one to compare ZoomInfo vs other sources.")
def render_records_tab(df_scanned, email_col: str) -> None:
    st.subheader("High-Risk Records (Sample)")

    high_risk = df_scanned[df_scanned["cz_risk"].isin(["invalid", "risky"])].copy().head(200)

    preferred_cols = [
        "first_name", "firstname", "last_name", "lastname", "name",
        email_col, "cz_risk", "cz_reason"
    ]
    show_cols = [c for c in preferred_cols if c in high_risk.columns]

    st.dataframe(high_risk[show_cols], use_container_width=True)

    st.divider()

    st.subheader("Export")
    st.download_button(
        "Download Scanned CSV",
        data=df_scanned.to_csv(index=False).encode("utf-8"),
        file_name="contactzen_scanned.csv",
        mime="text/csv",
    )
# ----------------------------
# UI
# ----------------------------

st.set_page_config(page_title="ContactZen MVP", layout="wide")
if "scan" not in st.session_state:
    st.session_state.scan = None

if "roi" not in st.session_state:
    st.session_state.roi = None

if "email_col" not in st.session_state:
    st.session_state.email_col = None

if "source_col" not in st.session_state:
    st.session_state.source_col = None

if "df_uploaded" not in st.session_state:
    st.session_state.df_uploaded = None
st.title("ContactZen")

st.markdown(
"""
**Revenue Data Health Platform**

Identify decayed contacts, quantify GTM waste, and prevent bad data from entering your CRM.
"""
)
st.title("ContactZen")

st.markdown(
"""
**Revenue Data Health Platform**

Identify decayed contacts, quantify GTM waste, and prevent bad data from entering your CRM.
"""
)

st.caption("Upload a CRM contact export (HubSpot, Salesforce, etc.) to scan for bad data, quantify impact, and uncover wasted spend.")
with st.sidebar:
    st.header("ROI Assumptions (Editable)")
    rep_hourly_cost = st.number_input("Fully Loaded Rep Cost per Hour ($)", min_value=10.0, max_value=250.0, value=50.0, step=5.0)
    cleanup_hours_per_rep_per_month = st.number_input("Manual Cleanup Hours per Rep per Month", min_value=0.0, max_value=40.0, value=2.0, step=0.5)
    confidence_factor = st.slider("Confidence Factor (Conservative)", min_value=0.0, max_value=1.0, value=0.5, step=0.05)

    st.divider()
    st.header("Company Motion Inputs")
    number_of_reps = st.number_input("Number of Reps", min_value=1, max_value=5000, value=25, step=1)
    emails_per_rep_per_week = st.number_input("Emails per Rep per Week", min_value=0, max_value=5000, value=200, step=25)
    new_contacts_per_rep_per_week = st.number_input("New Contacts per Rep per Week", min_value=0, max_value=2000, value=50, step=5)
    annual_data_cost = st.number_input("Annual Data Provider Cost ($)", min_value=0.0, max_value=5000000.0, value=18000.0, step=500.0)
st.subheader("1) Upload Contacts CSV")
st.caption("Tip: Include an email column and optionally a source column (e.g. ZoomInfo, manual import).")
uploaded = st.file_uploader("Upload a CSV export from HubSpot/Salesforce/any CRM.", type=["csv"])

if uploaded is not None:
    try:
        df = pd.read_csv(uploaded)
    except Exception:
        uploaded.seek(0)
        df = pd.read_csv(uploaded, encoding="latin-1")

    df = normalize_col(df)
    st.session_state.df_uploaded = df.copy()

    st.write(f"Loaded **{len(df):,}** rows and **{len(df.columns)}** columns.")

    email_col_guess = guess_email_col(df)
    source_col_guess = guess_source_col(df)

    c1, c2 = st.columns([1, 1])

    with c1:
        email_col = st.selectbox(
            "Select the email column",
            options=list(df.columns),
            index=(list(df.columns).index(email_col_guess) if email_col_guess in df.columns else 0),
            key="email_col_select",
        )

    with c2:
        source_col = st.selectbox(
            "Optional: select the source column (ZoomInfo, manual import, etc.)",
            options=["(none)"] + list(df.columns),
            index=(1 + list(df.columns).index(source_col_guess) if source_col_guess in df.columns else 0),
            key="source_col_select",
        )

    source_col = None if source_col == "(none)" else source_col

    st.subheader("2) Run Scan")

    if st.button("Run ContactZen Scan", type="primary"):
        with st.spinner("Scanning emails and scoring risk..."):
            scan = compute_scan(df, email_col=email_col, source_col=source_col)

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

        st.success("Scan complete.")

    if st.session_state.scan is not None and st.session_state.roi is not None:
        scan = st.session_state.scan
        roi = st.session_state.roi
        email_col = st.session_state.email_col

        tab1, tab2, tab3 = st.tabs([
            "Executive Summary",
            "RevOps Breakdown",
            "At-Risk Records"
        ])

        with tab1:
            render_executive_tab(scan, roi, number_of_reps)

        with tab2:
            render_revops_tab(scan, scan["df_scanned"])

        with tab3:
            render_records_tab(scan["df_scanned"], email_col)
