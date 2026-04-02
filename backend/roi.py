from dataclasses import dataclass


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
