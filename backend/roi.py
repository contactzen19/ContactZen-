"""
ContactZen — ROI computation.

Two APIs live here during the migration to the reachability-audit methodology:

  - calc_roi / ROIInputs        : legacy, consumed by /scan and /scan-hubspot in main.py.
                                  Does NOT match METHODOLOGY.md. Do not extend.
  - calc_audit_roi / AuditROIInputs : the methodology-correct calculation. New consumers
                                      should call this. Source of truth: METHODOLOGY.md.
"""

from dataclasses import asdict, dataclass, field


# =============================================================================
# Methodology constants — see METHODOLOGY.md for sourcing and rationale
# =============================================================================

# Industry actual per SBI / RAIN Group. Conservative on purpose so a CFO cannot
# pick the headline number apart. The v1 model used 65% (industry *target*) and
# was vulnerable to a sixty-second Google fact-check.
DEFAULT_SELLING_TIME_PCT = 0.35

# % of a contact list reps actually touch. Without this, Lever 2 inflates
# against any list larger than rep capacity.
DEFAULT_LIST_COVERAGE_PCT = 0.40

DEFAULT_REPLY_RATE = 0.015
DEFAULT_MTG_TO_DEAL_PCT = 0.20

# Google + Yahoo bulk sender enforcement, effective Feb 2024.
DELIVERABILITY_TARGET_BOUNCE_RATE = 0.003   # required compliance floor
DELIVERABILITY_BLACKLIST_RISK_RATE = 0.05   # above this, sender reputation craters


# =============================================================================
# LEGACY — kept intact so main.py / app.py continue working during migration
# =============================================================================


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
    annual_cleanup_hours = inputs.number_of_reps * inputs.cleanup_hours_per_rep_per_month * 12
    rep_productivity_loss = annual_cleanup_hours * inputs.rep_hourly_cost * inputs.risky_new_contact_rate
    annual_emails_sent = inputs.number_of_reps * inputs.emails_per_rep_per_week * 52
    wasted_emails = int(round(annual_emails_sent * inputs.invalid_email_rate))
    estimated_data_waste = (
        inputs.annual_data_cost * inputs.risky_new_contact_rate * inputs.confidence_factor
    )
    total_annual_impact = rep_productivity_loss + estimated_data_waste

    return {
        "annual_cleanup_hours": round(annual_cleanup_hours, 1),
        "rep_productivity_loss": round(rep_productivity_loss, 2),
        "annual_emails_sent": annual_emails_sent,
        "wasted_emails": wasted_emails,
        "estimated_data_waste": round(estimated_data_waste, 2),
        "total_annual_impact": round(total_annual_impact, 2),
    }


# =============================================================================
# AUDIT — methodology-correct calculation (METHODOLOGY.md)
# =============================================================================


@dataclass
class AuditROIInputs:
    """Inputs to the reachability-audit ROI calculation.

    `unreachable_rate` is the single locked input. Every dollar figure
    downstream is a function of it. Definition of unreachable is in
    METHODOLOGY.md — do not redefine it elsewhere.

    Any field populated from a methodology default rather than a
    client-confirmed number should be listed in `estimated_fields`,
    so the report can flag the assumption visibly to the reader.
    """

    unreachable_rate: float

    reps: int
    loaded_ote: float

    selling_time_pct: float = DEFAULT_SELLING_TIME_PCT

    contacts_in_list: int = 0
    list_coverage_pct: float = DEFAULT_LIST_COVERAGE_PCT
    reply_rate: float = DEFAULT_REPLY_RATE
    mtg_to_deal_pct: float = DEFAULT_MTG_TO_DEAL_PCT
    avg_contract_value: float = 0.0

    annual_data_spend: float = 0.0

    estimated_fields: list[str] = field(default_factory=list)


@dataclass
class LeverResult:
    label: str
    formula: str
    value: float
    inputs_used: dict
    is_estimate: bool


@dataclass
class AuditROIResult:
    wasted_rep_capacity: LeverResult       # Lever 1 — the headline
    recoverable_pipeline: LeverResult      # Lever 2 — the choice framing (do NOT sum with L1)
    wasted_data_spend: LeverResult         # Lever 3 — the footnote

    # Headline total presented to the buyer = L1 + L3 only.
    # L2 is NOT added — same rep-hours as L1, shown as the alternate framing.
    # Stacking them is the double-count a CFO walks over.
    headline_total_annual: float

    deliverability_at_risk: bool
    deliverability_target_bounce_rate: float
    deliverability_blacklist_threshold: float

    estimated_fields: list[str]


def _lever_1(inputs: AuditROIInputs) -> LeverResult:
    value = (
        inputs.reps
        * inputs.loaded_ote
        * inputs.selling_time_pct
        * inputs.unreachable_rate
    )
    return LeverResult(
        label="Wasted Rep Capacity",
        formula="Reps × Loaded OTE × Selling-Time% × Unreachable%",
        value=round(value, 2),
        inputs_used={
            "reps": inputs.reps,
            "loaded_ote": inputs.loaded_ote,
            "selling_time_pct": inputs.selling_time_pct,
            "unreachable_rate": inputs.unreachable_rate,
        },
        is_estimate=bool(
            {"loaded_ote", "selling_time_pct"} & set(inputs.estimated_fields)
        ),
    )


def _lever_2(inputs: AuditROIInputs) -> LeverResult:
    unreachable_contacts = inputs.contacts_in_list * inputs.unreachable_rate
    worked_unreachable = unreachable_contacts * inputs.list_coverage_pct
    value = (
        worked_unreachable
        * inputs.reply_rate
        * inputs.mtg_to_deal_pct
        * inputs.avg_contract_value
    )
    return LeverResult(
        label="Recoverable Pipeline",
        formula="(Unreachable × % of list worked) × Reply% × Mtg→Deal% × ACV",
        value=round(value, 2),
        inputs_used={
            "contacts_in_list": inputs.contacts_in_list,
            "unreachable_rate": inputs.unreachable_rate,
            "list_coverage_pct": inputs.list_coverage_pct,
            "reply_rate": inputs.reply_rate,
            "mtg_to_deal_pct": inputs.mtg_to_deal_pct,
            "avg_contract_value": inputs.avg_contract_value,
        },
        is_estimate=bool(
            {"list_coverage_pct", "reply_rate", "mtg_to_deal_pct"}
            & set(inputs.estimated_fields)
        ),
    )


def _lever_3(inputs: AuditROIInputs) -> LeverResult:
    value = inputs.annual_data_spend * inputs.unreachable_rate
    return LeverResult(
        label="Wasted Data Spend",
        formula="Annual data spend × Unreachable%",
        value=round(value, 2),
        inputs_used={
            "annual_data_spend": inputs.annual_data_spend,
            "unreachable_rate": inputs.unreachable_rate,
        },
        is_estimate=False,
    )


def calc_audit_roi(inputs: AuditROIInputs) -> AuditROIResult:
    l1 = _lever_1(inputs)
    l2 = _lever_2(inputs)
    l3 = _lever_3(inputs)

    return AuditROIResult(
        wasted_rep_capacity=l1,
        recoverable_pipeline=l2,
        wasted_data_spend=l3,
        headline_total_annual=round(l1.value + l3.value, 2),
        deliverability_at_risk=inputs.unreachable_rate > DELIVERABILITY_BLACKLIST_RISK_RATE,
        deliverability_target_bounce_rate=DELIVERABILITY_TARGET_BOUNCE_RATE,
        deliverability_blacklist_threshold=DELIVERABILITY_BLACKLIST_RISK_RATE,
        estimated_fields=list(inputs.estimated_fields),
    )


# Working hours per year for converting hourly cost <-> annual OTE.
# 40 hrs/wk × 52 wks. Used only as a bridge from the legacy `rep_hourly_cost`
# input until the frontend exposes Loaded OTE directly.
_ANNUAL_WORKING_HOURS = 2080


def audit_roi_from_legacy(
    legacy: ROIInputs,
    scan_results: dict,
    *,
    loaded_ote: float | None = None,
    selling_time_pct: float | None = None,
    list_coverage_pct: float | None = None,
    reply_rate: float | None = None,
    mtg_to_deal_pct: float | None = None,
    avg_contract_value: float | None = None,
) -> dict:
    """Bridge: compute the methodology audit ROI from the legacy /scan form fields + scan output.

    Each fact-finder field is optional. When the caller passes a positive value
    we treat it as client-confirmed and drop it from `estimated_fields`. When
    None (or 0 / non-positive — the UI's "not set" sentinel) we fall back to
    the methodology default and flag it as an estimate.

    `unreachable_rate` proxies via `scan_results["contact_high_risk_rate"]` — the
    broadest available signal today. This is not a perfect match for the locked
    methodology definition (bounces + role changes + abandoned inboxes +
    catch-all noise), and that gap should be closed when the scan engine is
    upgraded.
    """
    estimated: list[str] = []

    if loaded_ote and loaded_ote > 0:
        ote = loaded_ote
    else:
        ote = legacy.rep_hourly_cost * _ANNUAL_WORKING_HOURS
        estimated.append("loaded_ote")

    if selling_time_pct and selling_time_pct > 0:
        sell = selling_time_pct
    else:
        sell = DEFAULT_SELLING_TIME_PCT
        estimated.append("selling_time_pct")

    if list_coverage_pct and list_coverage_pct > 0:
        coverage = list_coverage_pct
    else:
        coverage = DEFAULT_LIST_COVERAGE_PCT
        estimated.append("list_coverage_pct")

    if reply_rate and reply_rate > 0:
        reply = reply_rate
    else:
        reply = DEFAULT_REPLY_RATE
        estimated.append("reply_rate")

    if mtg_to_deal_pct and mtg_to_deal_pct > 0:
        mtg = mtg_to_deal_pct
    else:
        mtg = DEFAULT_MTG_TO_DEAL_PCT
        estimated.append("mtg_to_deal_pct")

    if avg_contract_value and avg_contract_value > 0:
        acv = avg_contract_value
    else:
        acv = 0.0
        estimated.append("avg_contract_value")

    inputs = AuditROIInputs(
        unreachable_rate=scan_results.get("contact_high_risk_rate", scan_results.get("high_risk_rate", 0.0)),
        reps=legacy.number_of_reps,
        loaded_ote=ote,
        selling_time_pct=sell,
        contacts_in_list=scan_results.get("total", 0),
        list_coverage_pct=coverage,
        reply_rate=reply,
        mtg_to_deal_pct=mtg,
        avg_contract_value=acv,
        annual_data_spend=legacy.annual_data_cost,
        estimated_fields=estimated,
    )
    return asdict(calc_audit_roi(inputs))
