"""Vendor Scorecard — cost per reachable contact (CPRC).

The flagship metric per DIRECTION.md ("the buyer's side of the table"):

    CPRC = total vendor spend / reachable contacts delivered

Pricing-model-agnostic: spend is whatever the buyer pays the vendor per year
(seats, credits, usage). "Reachable" follows the locked METHODOLOGY.md
definition; the definition string travels with every scorecard payload so the
report can carry it inline wherever the number appears.

Inputs come from the scan's source_breakdown (per-source reachability counts)
plus a per-vendor annual spend map supplied by the user. No vendor cooperation
required: everything is computed from the buyer's own file and contract.
"""
from __future__ import annotations

from typing import Optional

from vendor_signals import normalize_source

# Carried inline with the metric — a vendor's only counter to CPRC is
# attacking this definition, so it ships with the number (DIRECTION.md).
REACHABLE_DEFINITION = (
    "Reachable: a contact that could produce a human reply if outreach were "
    "attempted. Unreachable contacts are hard bounces, role changes / departed "
    "employees, abandoned inboxes (no opens 12+ months despite delivery), and "
    "catch-all noise. Definition locked in METHODOLOGY.md."
)

# Sources that are not paid data vendors — excluded from the cost table
# (they still appear in the rollup so the report can show their quality).
NON_VENDOR_SOURCES = {"organic", "manual", "import", "referral", "event", "unknown", "other"}


def _vendor_key(raw) -> tuple[str, str, bool]:
    """(rollup key, display name, is_paid_vendor) for a raw source value.

    Known vendors merge under their canonical name. Unrecognized sources keep
    their own identity instead of collapsing into "other" — lead-buying shops
    purchase from niche vendors our alias map will never know, and each one
    needs its own scorecard row with its own spend input. Unknown sources are
    treated as paid candidates: the buyer knows which ones cost money, and a
    blank spend input costs nothing.
    """
    canonical, raw_clean = normalize_source(raw)
    if canonical != "other":
        return canonical, canonical, canonical not in NON_VENDOR_SOURCES
    key = raw_clean.strip().lower()
    if not key or key == "other":
        return "other", "other", False
    # compute_scan lowercases sources before they reach us, so original casing
    # is gone either way — title case reads best on the report.
    return key, raw_clean.strip().title(), True


def rollup_vendors(source_breakdown: Optional[list[dict]]) -> list[dict]:
    """Group the scan's per-source rows by vendor.

    Raw source values ("ZoomInfo Export", "zoominfo") merge via
    vendor_signals.normalize_source; unrecognized sources stay distinct (see
    _vendor_key). Reachable = total - invalid - risky - abandoned, matching
    the unreachable_rate convention in analysis.compute_scan.
    """
    if not source_breakdown:
        return []

    agg: dict[str, dict] = {}
    for row in source_breakdown:
        vendor, display, is_paid = _vendor_key(row.get("source"))
        a = agg.setdefault(vendor, {
            "vendor": vendor,
            "display": display,
            "is_paid_vendor": is_paid,
            "raw_sources": [],
            "total": 0,
            "count_bad": 0,
            "count_abandoned": 0,
        })
        a["raw_sources"].append(str(row.get("source", "")))
        a["total"] += int(row.get("total", 0))
        a["count_bad"] += int(row.get("count_bad", 0))
        a["count_abandoned"] += int(row.get("count_abandoned", 0))

    out = []
    for a in agg.values():
        total = a["total"]
        unreachable = min(total, a["count_bad"] + a["count_abandoned"])
        reachable = total - unreachable
        a["count_unreachable"] = unreachable
        a["count_reachable"] = reachable
        a["unreachable_rate"] = round(unreachable / total, 4) if total else 0.0
        a["reachable_rate"] = round(reachable / total, 4) if total else 0.0
        out.append(a)

    out.sort(key=lambda v: v["total"], reverse=True)
    return out


def build_scorecard(source_breakdown: Optional[list[dict]],
                    vendor_spend: Optional[dict[str, float]] = None) -> dict:
    """Full scorecard: vendor rollup + cost math for vendors with a spend figure.

    vendor_spend maps canonical vendor name -> annual spend in dollars.
    Cost fields are None when spend is absent or reachable count is zero,
    so the frontend renders a prompt instead of a fake number.
    """
    vendor_spend = {
        _vendor_key(k)[0]: float(v)
        for k, v in (vendor_spend or {}).items()
        if v is not None and float(v) > 0
    }

    vendors = rollup_vendors(source_breakdown)
    for v in vendors:
        spend = vendor_spend.get(v["vendor"])
        v["annual_spend"] = spend
        v["cost_per_contact"] = (
            round(spend / v["total"], 2) if spend and v["total"] else None
        )
        v["cost_per_reachable"] = (
            round(spend / v["count_reachable"], 2)
            if spend and v["count_reachable"] else None
        )
        if v["cost_per_contact"] and v["cost_per_reachable"]:
            v["reachability_premium_pct"] = round(
                (v["cost_per_reachable"] - v["cost_per_contact"])
                / v["cost_per_contact"], 4,
            )
        else:
            v["reachability_premium_pct"] = None
        # What the same contract would cost if the buyer only paid for
        # contacts that are real — the renewal anchor.
        v["right_sized_spend"] = (
            round(spend * v["reachable_rate"], 2) if spend else None
        )
        v["overpay_dollars"] = (
            round(spend - v["right_sized_spend"], 2)
            if spend and v["right_sized_spend"] is not None else None
        )

    priced = [v for v in vendors if v["cost_per_reachable"] is not None]
    headline = None
    if priced:
        worst = max(priced, key=lambda v: v["cost_per_reachable"])
        headline = {
            "vendor": worst["vendor"],
            "display": worst["display"],
            "cost_per_contact": worst["cost_per_contact"],
            "cost_per_reachable": worst["cost_per_reachable"],
            "overpay_dollars": worst["overpay_dollars"],
        }

    return {
        "vendors": vendors,
        "headline": headline,
        "total_overpay_dollars": round(
            sum(v["overpay_dollars"] for v in priced if v["overpay_dollars"]), 2,
        ) if priced else None,
        "reachable_definition": REACHABLE_DEFINITION,
    }
