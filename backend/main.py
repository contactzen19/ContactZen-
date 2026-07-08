import io
import math
import os
import re
import threading
import time
from datetime import datetime, timezone
from typing import Any, Optional

import pandas as pd
import requests as http
from fastapi import FastAPI, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, StreamingResponse

from analysis import (
    apply_fixes,
    compute_scan,
    normalize_columns,
    guess_email_col,
    guess_source_col,
    guess_phone_col,
    guess_last_send_col,
    guess_last_open_col,
    guess_last_reply_col,
)
from pydantic import BaseModel

from roi import ROIInputs, calc_roi, audit_roi_from_legacy
from signal_scoring import parse_hubspot_engagement, score_contact
from vendor_scorecard import build_scorecard, rollup_vendors
from vendor_signals import capture_scan_signals


def sanitize(obj: Any) -> Any:
    """Recursively replace NaN/Inf floats with None so FastAPI can serialize."""
    if isinstance(obj, float):
        return None if (math.isnan(obj) or math.isinf(obj)) else obj
    if isinstance(obj, dict):
        return {k: sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize(v) for v in obj]
    return obj

app = FastAPI(title="ContactZen API", version="1.0.0")

# ALLOWED_ORIGINS env var is a comma-separated list set in Railway dashboard
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://(.*\.vercel\.app|contactzen\.io|.*\.contactzen\.io|reachaudit\.com|.*\.reachaudit\.com)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def read_csv_upload(file: UploadFile) -> pd.DataFrame:
    contents = file.file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception:
        df = pd.read_csv(io.BytesIO(contents), encoding="latin-1")
    return normalize_columns(df)


# Free scans are capped: above this, the audit is a paid engagement.
# Sample (demo) files are exempt so the showroom can prove scale.
FREE_SCAN_ROW_CAP = 50_000


def enforce_row_cap(df: pd.DataFrame, is_sample: bool) -> None:
    if is_sample or len(df) <= FREE_SCAN_ROW_CAP:
        return
    raise HTTPException(
        status_code=413,
        detail=(
            f"This file has {len(df):,} contacts. Free scans cover up to "
            f"{FREE_SCAN_ROW_CAP:,} — audits at this scale are a working "
            f"engagement. Book a call and we'll run it together."
        ),
    )


@app.get("/health")
def health():
    return {"status": "ok"}


# --- Free-tool phone quick check ---------------------------------------------
# HARD RULE (Joey, 2026-07-08): the free tool must NEVER show, store, or use
# Do Not Call registry data. This endpoint uses RPV Turbo Standard ONLY
# (connected status + line type; the product returns no DNC fields at all).
# Never point this at DNC Lookup / DNC Plus. If the vendor response ever grows
# a DNC-looking field, it is dropped: we only read `status` and `phone_type`.
# DNC checks are the paid product, per customer, on that customer's own SAN.

RPV_ENDPOINT = "https://api.realvalidation.com/rpvWebService/Turbo.php"
PHONE_QUICK_CAP = 5           # numbers per request
PHONE_QUICK_DAILY_IP = 25     # numbers per IP per rolling 24h
_phone_rl_lock = threading.Lock()
_phone_rl: dict[str, list[float]] = {}


def _phone_rate_ok(ip: str, n: int) -> bool:
    """True if this IP may check n more numbers in the rolling 24h window."""
    now = time.time()
    with _phone_rl_lock:
        stamps = [t for t in _phone_rl.get(ip, []) if now - t < 86400]
        if len(stamps) + n > PHONE_QUICK_DAILY_IP:
            _phone_rl[ip] = stamps
            return False
        stamps.extend([now] * n)
        _phone_rl[ip] = stamps
        return True


class PhoneQuickRequest(BaseModel):
    phones: list[str]


@app.post("/api/phone-quick")
async def phone_quick(req: PhoneQuickRequest, request: Request):
    token = os.environ.get("RPV_TOKEN", "").strip()
    if not token:
        raise HTTPException(status_code=503, detail="Phone checking is not configured.")

    # Normalize to unique 10-digit US numbers, capped.
    seen: set[str] = set()
    phones: list[str] = []
    for raw in req.phones:
        digits = re.sub(r"\D", "", str(raw))
        if len(digits) == 11 and digits.startswith("1"):
            digits = digits[1:]
        if len(digits) == 10 and digits not in seen:
            seen.add(digits)
            phones.append(digits)
        if len(phones) >= PHONE_QUICK_CAP:
            break
    if not phones:
        raise HTTPException(status_code=400, detail="No valid 10-digit US phone numbers found.")

    fwd = request.headers.get("x-forwarded-for", "")
    ip = (fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "unknown"))
    if not _phone_rate_ok(ip, len(phones)):
        raise HTTPException(status_code=429, detail="Daily free phone-check limit reached. Book a call for a full audit.")

    results = []
    for p in phones:
        try:
            r = http.get(RPV_ENDPOINT, params={"output": "json", "phone": p, "token": token}, timeout=8)
            data = r.json() if r.ok else {}
        except Exception:
            data = {}
        status = str(data.get("status", "unknown")).strip().lower()
        phone_type = str(data.get("phone_type") or "").strip() or None
        if status.startswith("connected") or status == "busy":
            verdict = "live"
        elif status.startswith("disconnected") or status in ("unreachable", "invalid phone", "invalid-phone", "restricted"):
            verdict = "dead"
        else:
            verdict = "unknown"
        results.append({
            "phone": f"({p[0:3]}) {p[3:6]}-{p[6:]}",
            "verdict": verdict,
            "phone_type": phone_type,
        })

    return {"results": results, "checked": len(results)}


@app.post("/api/columns")
async def get_columns(file: UploadFile = File(...)):
    """Return column names and auto-detected guesses. Used for the column selector UI."""
    df = read_csv_upload(file)
    columns = list(df.columns)
    return {
        "columns": columns,
        "total_rows": len(df),
        "guesses": {
            "email": guess_email_col(df),
            "source": guess_source_col(df),
            "phone": guess_phone_col(df),
            "last_send": guess_last_send_col(df),
            "last_open": guess_last_open_col(df),
            "last_reply": guess_last_reply_col(df),
        },
    }


@app.post("/api/scan")
async def scan(
    file: UploadFile = File(...),
    email_col: str = Form(...),
    source_col: Optional[str] = Form(None),
    phone_col: Optional[str] = Form(None),
    last_send_col: Optional[str] = Form(None),
    last_open_col: Optional[str] = Form(None),
    last_reply_col: Optional[str] = Form(None),
    # ROI inputs
    number_of_reps: int = Form(25),
    emails_per_rep_per_week: int = Form(200),
    new_contacts_per_rep_per_week: int = Form(50),
    cleanup_hours_per_rep_per_month: float = Form(2.0),
    rep_hourly_cost: float = Form(50.0),
    annual_data_cost: float = Form(18000.0),
    # Reachability-audit fact-finder inputs. 0 = "not confirmed" — backend
    # falls back to methodology default and flags the field as an estimate.
    loaded_ote: float = Form(0.0),
    selling_time_pct: float = Form(0.0),
    list_coverage_pct: float = Form(0.0),
    reply_rate: float = Form(0.0),
    mtg_to_deal_pct: float = Form(0.0),
    avg_contract_value: float = Form(0.0),
    is_sample: bool = Form(False),
):
    """
    Core scan endpoint. Processes the uploaded CSV, returns scan results and ROI.
    Contact records are processed in memory and never persisted.
    """
    df = read_csv_upload(file)
    enforce_row_cap(df, is_sample)

    if email_col not in df.columns:
        raise HTTPException(status_code=400, detail=f"Email column '{email_col}' not found in file.")

    _source_col = source_col if source_col else None
    _phone_col = phone_col if phone_col else None

    scan_results = compute_scan(
        df,
        email_col=email_col,
        source_col=_source_col,
        phone_col=_phone_col,
        last_send_col=last_send_col if last_send_col else None,
        last_open_col=last_open_col if last_open_col else None,
        last_reply_col=last_reply_col if last_reply_col else None,
    )

    roi_inputs = ROIInputs(
        number_of_reps=number_of_reps,
        emails_per_rep_per_week=emails_per_rep_per_week,
        new_contacts_per_rep_per_week=new_contacts_per_rep_per_week,
        invalid_email_rate=scan_results["invalid_rate"],
        risky_new_contact_rate=scan_results["high_risk_rate"],
        cleanup_hours_per_rep_per_month=cleanup_hours_per_rep_per_month,
        rep_hourly_cost=rep_hourly_cost,
        annual_data_cost=annual_data_cost,
        confidence_factor=1.0,
    )
    roi = calc_roi(roi_inputs)
    audit_roi = audit_roi_from_legacy(
        roi_inputs,
        scan_results,
        loaded_ote=loaded_ote,
        selling_time_pct=selling_time_pct,
        list_coverage_pct=list_coverage_pct,
        reply_rate=reply_rate,
        mtg_to_deal_pct=mtg_to_deal_pct,
        avg_contract_value=avg_contract_value,
    )

    # Anonymized vendor-quality signal capture. Best-effort: errors here are
    # silent so the scan response is never blocked by telemetry.
    try:
        # account_id=None until auth is wired; the public index gate stays shut
        # by design while it's null (a cell can't reach 5 distinct customers).
        capture_scan_signals(df, email_col, _source_col, _phone_col, account_id=None)
    except Exception:
        pass

    # Canonical-vendor reachability rollup (no cost data yet — the frontend
    # prompts for per-vendor spend and calls /api/vendor-scorecard).
    vendor_rollup = rollup_vendors(scan_results.get("source_breakdown"))

    return sanitize({
        "scan": scan_results,
        "roi": roi,
        "audit_roi": audit_roi,
        "vendor_rollup": vendor_rollup,
    })


class VendorScorecardRequest(BaseModel):
    source_breakdown: list[dict]
    vendor_spend: dict[str, float]


@app.post("/api/vendor-scorecard")
async def vendor_scorecard(req: VendorScorecardRequest):
    """Cost-per-reachable-contact table. Stateless: takes the scan's
    source_breakdown plus a per-vendor annual spend map, returns CPRC,
    reachability premium, and the right-sized renewal line per vendor.
    All money math stays server-side so prospect-facing numbers remain
    methodology-locked."""
    return sanitize(build_scorecard(req.source_breakdown, req.vendor_spend))


@app.post("/api/fix")
async def fix_and_export(
    file: UploadFile = File(...),
    email_col: str = Form(...),
    phone_col: Optional[str] = Form(None),
    fixes: str = Form(""),  # comma-separated list of fix names
    export_type: str = Form("clean"),  # "clean" or "suppression"
    is_sample: bool = Form(False),
):
    """
    Apply selected fixes and stream back the result as a CSV download.
    The file is processed in memory and never stored.
    """
    df = read_csv_upload(file)
    enforce_row_cap(df, is_sample)

    if email_col not in df.columns:
        raise HTTPException(status_code=400, detail=f"Email column '{email_col}' not found.")

    # Re-run scoring so we have risk columns to filter on
    from analysis import compute_scan as _scan
    scan_result = _scan(df, email_col=email_col, phone_col=phone_col if phone_col else None)

    # Reconstruct the scored df — pull it from the scan internals
    # We need the annotated df, so we re-derive it here
    from scoring import email_risk, phone_risk
    df_scored = df.copy()
    risks = [email_risk(e) for e in df_scored[email_col].astype(str).fillna("").tolist()]
    df_scored["cz_risk"] = [r[0] for r in risks]
    df_scored["cz_reason"] = [r[1] for r in risks]

    if phone_col and phone_col in df_scored.columns:
        phone_risks = [phone_risk(p) for p in df_scored[phone_col].tolist()]
        df_scored["cz_phone_risk"] = [r[0] for r in phone_risks]
        df_scored["cz_phone_reason"] = [r[1] for r in phone_risks]

    fix_list = [f.strip() for f in fixes.split(",") if f.strip()]
    clean_df, removed_df = apply_fixes(df_scored, email_col, phone_col if phone_col else None, fix_list)

    output_df = clean_df if export_type == "clean" else removed_df
    filename = "contactzen_clean.csv" if export_type == "clean" else "contactzen_suppression.csv"

    csv_bytes = output_df.to_csv(index=False).encode("utf-8")
    return StreamingResponse(
        io.BytesIO(csv_bytes),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── HubSpot OAuth ──────────────────────────────────────────────────────────────

HUBSPOT_CLIENT_ID = os.getenv("HUBSPOT_CLIENT_ID", "")
HUBSPOT_CLIENT_SECRET = os.getenv("HUBSPOT_CLIENT_SECRET", "")
HUBSPOT_REDIRECT_URI = os.getenv(
    "HUBSPOT_REDIRECT_URI",
    "https://contactzen-production.up.railway.app/auth/hubspot/callback",
)
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://contactzen.io")


@app.get("/auth/hubspot")
def hubspot_auth():
    """Redirect user to HubSpot OAuth consent screen."""
    scopes = (
        "crm.objects.contacts.read "
        "crm.objects.contacts.write "
        "crm.objects.engagements.read "
        "crm.objects.tasks.write "
        "crm.schemas.contacts.write"
    )
    url = (
        f"https://app.hubspot.com/oauth/authorize"
        f"?client_id={HUBSPOT_CLIENT_ID}"
        f"&redirect_uri={HUBSPOT_REDIRECT_URI}"
        f"&scope={scopes.replace(' ', '%20')}"
    )
    return RedirectResponse(url)


@app.get("/auth/hubspot/callback")
def hubspot_callback(code: str):
    """Exchange auth code for access token, send token to frontend."""
    resp = http.post(
        "https://api.hubapi.com/oauth/v1/token",
        data={
            "grant_type": "authorization_code",
            "client_id": HUBSPOT_CLIENT_ID,
            "client_secret": HUBSPOT_CLIENT_SECRET,
            "redirect_uri": HUBSPOT_REDIRECT_URI,
            "code": code,
        },
    )
    if not resp.ok:
        raise HTTPException(status_code=400, detail="HubSpot token exchange failed")

    token = resp.json().get("access_token")
    return RedirectResponse(f"{FRONTEND_URL}/hubspot/callback?token={token}")


@app.post("/api/hubspot/writeback")
async def hubspot_writeback(access_token: str = Form(...)):
    """
    Fetch contacts from HubSpot, score them, and write cz_ properties back.
    Ensures custom properties exist first. Token is never stored.
    """
    headers = {"Authorization": f"Bearer {access_token}"}

    # Fetch contacts (email only — we just need to score and write back)
    contacts = []
    after = None
    while len(contacts) < 10000:
        params: dict = {"limit": 100, "properties": "email"}
        if after:
            params["after"] = after
        r = http.get("https://api.hubapi.com/crm/v3/objects/contacts", headers=headers, params=params, timeout=30)
        if not r.ok:
            raise HTTPException(status_code=400, detail="Failed to fetch HubSpot contacts")
        data = r.json()
        contacts.extend(data.get("results", []))
        if "next" not in data.get("paging", {}):
            break
        after = data["paging"]["next"]["after"]

    # Score each contact
    from scoring import email_risk as _email_risk
    updates = []
    for c in contacts:
        email = (c.get("properties") or {}).get("email") or ""
        risk_level, reason = _email_risk(email)
        updates.append({
            "id": c["id"],
            "properties": {
                "cz_risk": risk_level,
                "cz_reason": reason,
                "cz_risky_email": "true" if risk_level == "risky" else "false",
            },
        })

    # Batch update in chunks of 100
    errors = 0
    for i in range(0, len(updates), 100):
        batch = updates[i:i + 100]
        r = http.post(
            "https://api.hubapi.com/crm/v3/objects/contacts/batch/update",
            headers=headers,
            json={"inputs": batch},
            timeout=60,
        )
        if not r.ok:
            errors += len(batch)

    return {"updated": len(updates) - errors, "errors": errors, "total": len(updates)}


@app.post("/api/scan/hubspot")
async def scan_hubspot(
    access_token: str = Form(...),
    number_of_reps: int = Form(25),
    emails_per_rep_per_week: int = Form(200),
    new_contacts_per_rep_per_week: int = Form(50),
    cleanup_hours_per_rep_per_month: float = Form(2.0),
    rep_hourly_cost: float = Form(50.0),
    annual_data_cost: float = Form(18000.0),
    loaded_ote: float = Form(0.0),
    selling_time_pct: float = Form(0.0),
    list_coverage_pct: float = Form(0.0),
    reply_rate: float = Form(0.0),
    mtg_to_deal_pct: float = Form(0.0),
    avg_contract_value: float = Form(0.0),
):
    """Fetch contacts from HubSpot, run scan, return results. Token is never stored."""
    contacts = []
    after = None
    props = "email,phone,firstname,lastname,company,jobtitle"

    while len(contacts) < 10000:
        params: dict = {"limit": 100, "properties": props}
        if after:
            params["after"] = after

        r = http.get(
            "https://api.hubapi.com/crm/v3/objects/contacts",
            headers={"Authorization": f"Bearer {access_token}"},
            params=params,
            timeout=30,
        )
        if not r.ok:
            raise HTTPException(status_code=400, detail="Failed to fetch HubSpot contacts")

        data = r.json()
        contacts.extend(data.get("results", []))

        paging = data.get("paging", {})
        if "next" not in paging:
            break
        after = paging["next"]["after"]

    rows = []
    for c in contacts:
        p = c.get("properties", {})
        rows.append({
            "email": p.get("email") or "",
            "phone": p.get("phone") or "",
            "first_name": p.get("firstname") or "",
            "last_name": p.get("lastname") or "",
            "company": p.get("company") or "",
            "title": p.get("jobtitle") or "",
            "source": "HubSpot",
        })

    if not rows:
        raise HTTPException(status_code=400, detail="No contacts found in HubSpot account")

    df = pd.DataFrame(rows)

    scan_results = compute_scan(df, email_col="email", phone_col="phone", source_col="source")

    roi_inputs = ROIInputs(
        number_of_reps=number_of_reps,
        emails_per_rep_per_week=emails_per_rep_per_week,
        new_contacts_per_rep_per_week=new_contacts_per_rep_per_week,
        invalid_email_rate=scan_results["invalid_rate"],
        risky_new_contact_rate=scan_results["high_risk_rate"],
        cleanup_hours_per_rep_per_month=cleanup_hours_per_rep_per_month,
        rep_hourly_cost=rep_hourly_cost,
        annual_data_cost=annual_data_cost,
        confidence_factor=1.0,
    )
    roi = calc_roi(roi_inputs)
    audit_roi = audit_roi_from_legacy(
        roi_inputs,
        scan_results,
        loaded_ote=loaded_ote,
        selling_time_pct=selling_time_pct,
        list_coverage_pct=list_coverage_pct,
        reply_rate=reply_rate,
        mtg_to_deal_pct=mtg_to_deal_pct,
        avg_contract_value=avg_contract_value,
    )

    # Anonymized vendor-quality signal capture (HubSpot path).
    try:
        # TODO: pass the HubSpot portal id as account_id here once available —
        # it's the natural de-identified per-customer key for index gating.
        capture_scan_signals(df, "email", "source", "phone", account_id=None)
    except Exception:
        pass

    return sanitize({"scan": scan_results, "roi": roi, "audit_roi": audit_roi})


# ── Signal Scoring Engine ──────────────────────────────────────────────────────

MAX_ENGAGEMENTS = 50_000  # cap for portal-wide fetch (~6 months for active orgs)


def _hs_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _ensure_cz_properties(token: str) -> None:
    """
    Create ContactZen custom contact properties in HubSpot if they don't exist.
    Silently ignores 409 (already exists) responses.
    """
    props = [
        {
            "name": "cz_score",
            "label": "ContactZen Score",
            "type": "number",
            "fieldType": "number",
            "groupName": "contactinformation",
            "description": "ContactZen behavioral engagement score (0-200). Higher = more buying signals.",
        },
        {
            "name": "cz_score_tier",
            "label": "ContactZen Score Tier",
            "type": "enumeration",
            "fieldType": "select",
            "groupName": "contactinformation",
            "description": "ContactZen prospect tier: hot, warm, cold, or dead.",
            "options": [
                {"label": "Hot",  "value": "hot",  "displayOrder": 0, "hidden": False},
                {"label": "Warm", "value": "warm", "displayOrder": 1, "hidden": False},
                {"label": "Cold", "value": "cold", "displayOrder": 2, "hidden": False},
                {"label": "Dead", "value": "dead", "displayOrder": 3, "hidden": False},
            ],
        },
        {
            "name": "cz_signal_summary",
            "label": "ContactZen Signal Summary",
            "type": "string",
            "fieldType": "text",
            "groupName": "contactinformation",
            "description": "Recent engagement signals detected by ContactZen.",
        },
        {
            "name": "cz_last_scored",
            "label": "ContactZen Last Scored",
            "type": "datetime",
            "fieldType": "date",
            "groupName": "contactinformation",
            "description": "Timestamp of the most recent ContactZen scoring run.",
        },
        {
            "name": "cz_disposition",
            "label": "ContactZen Disposition",
            "type": "enumeration",
            "fieldType": "select",
            "groupName": "contactinformation",
            "description": "Rep-assigned contact disposition. Set via ContactZen CRM card. Survives scoring reruns.",
            "options": [
                {"label": "Active",           "value": "active",           "displayOrder": 0, "hidden": False},
                {"label": "Not a Buyer",      "value": "not_a_buyer",      "displayOrder": 1, "hidden": False},
                {"label": "Bad Timing",       "value": "bad_timing",       "displayOrder": 2, "hidden": False},
                {"label": "No Budget",        "value": "no_budget",        "displayOrder": 3, "hidden": False},
                {"label": "Unresponsive",     "value": "unresponsive",     "displayOrder": 4, "hidden": False},
                {"label": "Do Not Contact",   "value": "do_not_contact",   "displayOrder": 5, "hidden": False},
            ],
        },
    ]
    headers = _hs_headers(token)
    for prop in props:
        http.post(
            "https://api.hubapi.com/crm/v3/properties/contacts",
            headers=headers,
            json=prop,
            timeout=15,
        )
        # 409 = already exists — intentionally not raising on this


@app.post("/api/hubspot/score")
async def score_hubspot_contacts(access_token: str = Form(...)):
    """
    Full scoring run against a connected HubSpot portal:
    1. Fetch engagement history portal-wide (capped at MAX_ENGAGEMENTS)
    2. Group signals by contact ID
    3. Score each contact with time-decay weighting
    4. Ensure cz_ custom properties exist in HubSpot
    5. Write scores back in batches of 100
    """
    headers = _hs_headers(access_token)
    now = datetime.now(timezone.utc)

    # Step 1: Fetch engagements portal-wide ────────────────────────────────────
    signals_by_contact: dict[str, list] = {}
    total_fetched = 0
    offset = 0
    has_more = True

    while has_more and total_fetched < MAX_ENGAGEMENTS:
        r = http.get(
            "https://api.hubapi.com/engagements/v1/engagements/paged",
            headers=headers,
            params={"limit": 250, "offset": offset},
            timeout=60,
        )
        if not r.ok:
            break

        data = r.json()
        results = data.get("results", [])

        for eng in results:
            event = parse_hubspot_engagement(eng)
            if not event:
                continue
            for cid in eng.get("associations", {}).get("contactIds", []):
                signals_by_contact.setdefault(str(cid), []).append(event)

        total_fetched += len(results)
        has_more = data.get("hasMore", False)
        offset = data.get("offset", offset + 250)

    # Step 2: Fetch all contacts ───────────────────────────────────────────────
    contacts = []
    after = None

    while True:
        params: dict = {
            "limit": 100,
            "properties": "email,hubspot_owner_id,firstname,lastname",
        }
        if after:
            params["after"] = after

        r = http.get(
            "https://api.hubapi.com/crm/v3/objects/contacts",
            headers=headers,
            params=params,
            timeout=30,
        )
        if not r.ok:
            raise HTTPException(status_code=400, detail="Failed to fetch HubSpot contacts")

        data = r.json()
        contacts.extend(data.get("results", []))

        if "next" not in data.get("paging", {}):
            break
        after = data["paging"]["next"]["after"]

    # Step 3: Score each contact ───────────────────────────────────────────────
    tier_counts: dict[str, int] = {"hot": 0, "warm": 0, "cold": 0, "dead": 0}
    updates = []
    scored_at_iso = now.strftime("%Y-%m-%dT%H:%M:%S.000Z")

    for c in contacts:
        cid = c["id"]
        events = signals_by_contact.get(cid, [])
        result = score_contact(events, now=now)
        tier = result["tier"]
        tier_counts[tier] = tier_counts.get(tier, 0) + 1

        updates.append({
            "id": cid,
            "properties": {
                "cz_score": str(result["score"]),
                "cz_score_tier": tier,
                "cz_signal_summary": result["signal_summary"],
                "cz_last_scored": scored_at_iso,
            },
        })

    # Step 4: Ensure custom properties exist ───────────────────────────────────
    _ensure_cz_properties(access_token)

    # Step 5: Batch write back ─────────────────────────────────────────────────
    errors = 0
    for i in range(0, len(updates), 100):
        batch = updates[i : i + 100]
        r = http.post(
            "https://api.hubapi.com/crm/v3/objects/contacts/batch/update",
            headers=headers,
            json={"inputs": batch},
            timeout=60,
        )
        if not r.ok:
            errors += len(batch)

    return {
        "total_contacts": len(contacts),
        "contacts_with_signals": len(signals_by_contact),
        "engagements_processed": total_fetched,
        "errors": errors,
        "tiers": tier_counts,
        "scored_at": scored_at_iso,
    }


@app.get("/api/hubspot/story")
async def get_contact_story(
    contact_id: str = Query(...),
    access_token: str = Query(...),
):
    """
    Return the score + story for a single contact by ID.
    Used by the Chrome extension to render the contact story panel inline.
    """
    headers = _hs_headers(access_token)

    r = http.get(
        f"https://api.hubapi.com/engagements/v1/engagements/associated/CONTACT/{contact_id}/paged",
        headers=headers,
        params={"limit": 100},
        timeout=30,
    )
    if not r.ok:
        raise HTTPException(status_code=400, detail="Failed to fetch contact engagements")

    events = []
    for eng in r.json().get("results", []):
        event = parse_hubspot_engagement(eng)
        if event:
            events.append(event)

    return score_contact(events)


@app.post("/api/hubspot/create-tasks")
async def create_tasks_for_hot_contacts(access_token: str = Form(...)):
    """
    Query all Hot contacts (cz_score_tier = 'hot') and create a HubSpot call
    task on their owner. Task subject includes score + signal summary so the
    rep knows exactly why this contact is hot before picking up the phone.
    """
    headers = _hs_headers(access_token)
    now_ms = str(int(datetime.now(timezone.utc).timestamp() * 1000))

    r = http.post(
        "https://api.hubapi.com/crm/v3/objects/contacts/search",
        headers=headers,
        json={
            "filterGroups": [{
                "filters": [{
                    "propertyName": "cz_score_tier",
                    "operator": "EQ",
                    "value": "hot",
                }]
            }],
            "properties": [
                "email", "firstname", "lastname",
                "cz_score", "cz_signal_summary", "hubspot_owner_id",
            ],
            "limit": 100,
        },
        timeout=30,
    )
    if not r.ok:
        raise HTTPException(status_code=400, detail="Failed to search hot contacts")

    hot_contacts = r.json().get("results", [])
    tasks_created = 0
    errors = 0

    for c in hot_contacts:
        props = c.get("properties", {})
        first = props.get("firstname") or ""
        last = props.get("lastname") or ""
        name = f"{first} {last}".strip() or props.get("email") or "Contact"
        score = props.get("cz_score") or "?"
        summary = props.get("cz_signal_summary") or "Recent engagement detected"
        owner_id = props.get("hubspot_owner_id")

        task_props: dict = {
            "hs_task_subject": f"\U0001f525 Call {name} \u2014 Score {score}",
            "hs_task_body": summary,
            "hs_task_status": "NOT_STARTED",
            "hs_task_type": "CALL",
            "hs_timestamp": now_ms,
        }
        if owner_id:
            task_props["hubspot_owner_id"] = owner_id

        task_r = http.post(
            "https://api.hubapi.com/crm/v3/objects/tasks",
            headers=headers,
            json={"properties": task_props},
            timeout=20,
        )

        if not task_r.ok:
            errors += 1
            continue

        task_id = task_r.json().get("id")
        if task_id:
            http.put(
                f"https://api.hubapi.com/crm/v3/objects/tasks/{task_id}"
                f"/associations/contacts/{c['id']}/task_to_contact",
                headers=headers,
                timeout=15,
            )
        tasks_created += 1

    return {
        "hot_contacts": len(hot_contacts),
        "tasks_created": tasks_created,
        "errors": errors,
    }


VALID_DISPOSITIONS = {
    "active", "not_a_buyer", "bad_timing", "no_budget", "unresponsive", "do_not_contact"
}


@app.post("/api/hubspot/set-disposition")
async def set_disposition(
    contact_id: str = Form(...),
    disposition: str = Form(...),
    access_token: str = Form(...),
):
    """
    Write a rep-assigned disposition to a single contact's cz_disposition property.
    Called from the ContactZen CRM card action buttons and ScorePanel UI.
    Disposition survives scoring reruns — scoring never overwrites this field.
    """
    if disposition not in VALID_DISPOSITIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid disposition '{disposition}'. Must be one of: {', '.join(sorted(VALID_DISPOSITIONS))}",
        )

    _ensure_cz_properties(access_token)

    r = http.patch(
        f"https://api.hubapi.com/crm/v3/objects/contacts/{contact_id}",
        headers=_hs_headers(access_token),
        json={"properties": {"cz_disposition": disposition}},
        timeout=15,
    )

    if not r.ok:
        raise HTTPException(
            status_code=r.status_code,
            detail=f"HubSpot write failed: {r.text[:200]}",
        )

    return {"contact_id": contact_id, "disposition": disposition, "updated": True}
