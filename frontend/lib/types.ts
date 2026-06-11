export interface UnreachableBucket {
  count: number;
  rate: number;
  detected: boolean;
  note: string;
}

export interface UnreachableBreakdown {
  hard_bounce: UnreachableBucket;
  catch_all_or_disposable: UnreachableBucket;
  role_change: UnreachableBucket;
  abandoned_inbox: UnreachableBucket;
}

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
  // Methodology-locked email-only unreachable rate + bucket breakdown.
  // Optional on the type so older encoded reports without these fields still parse.
  unreachable_rate?: number;
  unreachable_breakdown?: UnreachableBreakdown;
  completeness_score: number;
  field_fill_rates: Record<string, number>;
  email_dupes: number;
  phone_dupes: number;
  source_breakdown: SourceRow[] | null;
  zoominfo_high_risk_rate: number | null;
  bad_zoominfo_contacts: number;
  zoominfo_flagged_sample: Record<string, unknown>[];
  high_risk_sample: Record<string, unknown>[];
  col_guesses: {
    email: string | null;
    source: string | null;
    phone: string | null;
    last_send?: string | null;
    last_open?: string | null;
    last_reply?: string | null;
  };
}

export interface ROIResult {
  annual_cleanup_hours: number;
  rep_productivity_loss: number;
  annual_emails_sent: number;
  wasted_emails: number;
  estimated_data_waste: number;
  total_annual_impact: number;
}

// Methodology-correct audit ROI. Returned alongside ROIResult during migration.
// Shape matches backend/roi.py AuditROIResult dataclass. Source: METHODOLOGY.md.
export interface LeverResult {
  label: string;
  formula: string;
  value: number;
  inputs_used: Record<string, number>;
  is_estimate: boolean;
}

export interface AuditROIResult {
  wasted_rep_capacity: LeverResult;     // Lever 1 — headline
  recoverable_pipeline: LeverResult;    // Lever 2 — choice framing, NOT summed with L1
  wasted_data_spend: LeverResult;       // Lever 3 — footnote
  headline_total_annual: number;        // L1 + L3 only
  deliverability_at_risk: boolean;
  deliverability_target_bounce_rate: number;
  deliverability_blacklist_threshold: number;
  estimated_fields: string[];
}

export interface SourceRow {
  source: string;
  invalid?: number;
  risky?: number;
  valid?: number;
  // Extended (sent when /api/scan computes a source breakdown). Older
  // encoded reports may omit these — render code must treat them as optional.
  total?: number;
  count_invalid?: number;
  count_risky?: number;
  count_valid?: number;
  count_bad?: number;
  count_abandoned?: number;
  abandoned_rate?: number;
  unreachable_rate?: number;
}

// Canonical-vendor reachability rollup, returned with every scan.
// Cost fields arrive only from /api/vendor-scorecard once spend is entered.
export interface VendorRollupRow {
  vendor: string;
  display?: string;          // raw vendor name for sources not in the alias map
  is_paid_vendor: boolean;
  raw_sources: string[];
  total: number;
  count_bad: number;
  count_abandoned: number;
  count_unreachable: number;
  count_reachable: number;
  unreachable_rate: number;
  reachable_rate: number;
  // Priced fields (null until spend is supplied)
  annual_spend?: number | null;
  cost_per_contact?: number | null;
  cost_per_reachable?: number | null;
  reachability_premium_pct?: number | null;
  right_sized_spend?: number | null;
  overpay_dollars?: number | null;
}

export interface VendorScorecardResponse {
  vendors: VendorRollupRow[];
  headline: {
    vendor: string;
    display?: string;
    cost_per_contact: number;
    cost_per_reachable: number;
    overpay_dollars: number | null;
  } | null;
  total_overpay_dollars: number | null;
  reachable_definition: string;
}

export interface ColumnsResponse {
  columns: string[];
  total_rows: number;
  guesses: {
    email: string | null;
    source: string | null;
    phone: string | null;
    last_send: string | null;
    last_open: string | null;
    last_reply: string | null;
  };
}

export interface ROIInputs {
  number_of_reps: number;
  emails_per_rep_per_week: number;
  new_contacts_per_rep_per_week: number;
  cleanup_hours_per_rep_per_month: number;
  rep_hourly_cost: number;
  annual_data_cost: number;
  // Reachability-audit fact-finder. Each field is optional from the user's
  // perspective — left at default, backend flags it under `estimated_fields`.
  loaded_ote: number;
  selling_time_pct: number;
  list_coverage_pct: number;
  reply_rate: number;
  mtg_to_deal_pct: number;
  avg_contract_value: number;
}
