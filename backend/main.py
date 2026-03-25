import io
import math
import os
from typing import Any, Optional

import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from analysis import apply_fixes, compute_scan, normalize_columns, guess_email_col, guess_source_col, guess_phone_col
from roi import ROIInputs, calc_roi


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
    allow_origin_regex=r"https://(.*\.vercel\.app|contactzen\.io|.*\.contactzen\.io)",
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


@app.get("/health")
def health():
    return {"status": "ok"}


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
        },
    }


@app.post("/api/scan")
async def scan(
    file: UploadFile = File(...),
    email_col: str = Form(...),
    source_col: Optional[str] = Form(None),
    phone_col: Optional[str] = Form(None),
    # ROI inputs
    number_of_reps: int = Form(25),
    emails_per_rep_per_week: int = Form(200),
    new_contacts_per_rep_per_week: int = Form(50),
    cleanup_hours_per_rep_per_month: float = Form(2.0),
    rep_hourly_cost: float = Form(50.0),
    annual_data_cost: float = Form(18000.0),
    confidence_factor: float = Form(0.5),
):
    """
    Core scan endpoint. Processes the uploaded CSV, returns scan results and ROI.
    Contact records are processed in memory and never persisted.
    """
    df = read_csv_upload(file)

    if email_col not in df.columns:
        raise HTTPException(status_code=400, detail=f"Email column '{email_col}' not found in file.")

    scan_results = compute_scan(
        df,
        email_col=email_col,
        source_col=source_col if source_col else None,
        phone_col=phone_col if phone_col else None,
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
        confidence_factor=confidence_factor,
    )
    roi = calc_roi(roi_inputs)

    return sanitize({"scan": scan_results, "roi": roi})


@app.post("/api/fix")
async def fix_and_export(
    file: UploadFile = File(...),
    email_col: str = Form(...),
    phone_col: Optional[str] = Form(None),
    fixes: str = Form(""),  # comma-separated list of fix names
    export_type: str = Form("clean"),  # "clean" or "suppression"
):
    """
    Apply selected fixes and stream back the result as a CSV download.
    The file is processed in memory and never stored.
    """
    df = read_csv_upload(file)

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
