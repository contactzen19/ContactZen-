export interface ScanResult {
  total: number;
  invalid: number;
  risky: number;
  valid: number;
  invalid_rate: number;
  high_risk_rate: number;
  phone_invalid: number;
  phone_risky: number;
  phone_valid: number;
  phone_high_risk_rate: number;
  contact_invalid: number;
  contact_risky: number;
  contact_valid: number;
  contact_high_risk_rate: number;
  completeness_score: number;
  field_fill_rates: Record<string, number>;
  email_dupes: number;
  phone_dupes: number;
  source_breakdown: SourceRow[] | null;
  zoominfo_high_risk_rate: number | null;
  bad_zoominfo_contacts: number;
  zoominfo_flagged_sample: Record<string, unknown>[];
  high_risk_sample: Record<string, unknown>[];
  col_guesses: { email: string | null; source: string | null; phone: string | null };
}

export interface ROIResult {
  annual_cleanup_hours: number;
  rep_productivity_loss: number;
  annual_emails_sent: number;
  wasted_emails: number;
  estimated_data_waste: number;
  total_annual_impact: number;
}

export interface SourceRow {
  source: string;
  invalid?: number;
  risky?: number;
  valid?: number;
}

export interface ColumnsResponse {
  columns: string[];
  total_rows: number;
  guesses: { email: string | null; source: string | null; phone: string | null };
}

export interface ROIInputs {
  number_of_reps: number;
  emails_per_rep_per_week: number;
  new_contacts_per_rep_per_week: number;
  cleanup_hours_per_rep_per_month: number;
  rep_hourly_cost: number;
  annual_data_cost: number;
  confidence_factor: number;
}
