import { ScanResult, ROIResult } from "./types";

export interface ReportSummary {
  total: number;
  contact_invalid: number;
  contact_valid: number;
  contact_high_risk_rate: number;
  invalid: number;
  risky: number;
  valid: number;
  high_risk_rate: number;
  phone_invalid: number;
  phone_risky: number;
  phone_valid: number;
  phone_missing: number;
  phone_high_risk_rate: number;
  completeness_score: number;
  field_fill_rates: Record<string, number>;
  email_dupes: number;
  phone_dupes: number;
  zoominfo_high_risk_rate: number | null;
  bad_zoominfo_contacts: number;
  source_breakdown: { source: string; invalid?: number; risky?: number; valid?: number }[] | null;
  roi: ROIResult;
  scanned_at: string;
  number_of_reps: number;
}

export function buildSummary(scan: ScanResult, roi: ROIResult, numberOfReps: number): ReportSummary {
  return {
    total: scan.total,
    contact_invalid: scan.contact_invalid,
    contact_valid: scan.contact_valid,
    contact_high_risk_rate: scan.contact_high_risk_rate,
    invalid: scan.invalid,
    risky: scan.risky,
    valid: scan.valid,
    high_risk_rate: scan.high_risk_rate,
    phone_invalid: scan.phone_invalid,
    phone_risky: scan.phone_risky,
    phone_valid: scan.phone_valid,
    phone_missing: 0,
    phone_high_risk_rate: scan.phone_high_risk_rate,
    completeness_score: scan.completeness_score,
    field_fill_rates: scan.field_fill_rates,
    email_dupes: scan.email_dupes,
    phone_dupes: scan.phone_dupes,
    zoominfo_high_risk_rate: scan.zoominfo_high_risk_rate,
    bad_zoominfo_contacts: scan.bad_zoominfo_contacts,
    source_breakdown: scan.source_breakdown ? scan.source_breakdown.slice(0, 10) : null,
    roi,
    scanned_at: new Date().toISOString().split("T")[0],
    number_of_reps: numberOfReps,
  };
}

export function encodeReport(scan: ScanResult, roi: ROIResult, numberOfReps: number): string {
  return btoa(encodeURIComponent(JSON.stringify(buildSummary(scan, roi, numberOfReps))));
}

export function encodeSummary(summary: ReportSummary): string {
  return btoa(encodeURIComponent(JSON.stringify(summary)));
}

export function decodeReport(encoded: string): ReportSummary | null {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded)));
  } catch {
    return null;
  }
}

// Reconstruct a ScanResult from the summary (no contact-level records)
export function summaryToScanResult(s: ReportSummary): ScanResult {
  return {
    total: s.total,
    contact_invalid: s.contact_invalid,
    contact_risky: 0,
    contact_valid: s.contact_valid,
    contact_high_risk_rate: s.contact_high_risk_rate,
    invalid: s.invalid,
    risky: s.risky,
    valid: s.valid,
    high_risk_rate: s.high_risk_rate,
    invalid_rate: s.high_risk_rate,
    phone_invalid: s.phone_invalid,
    phone_risky: s.phone_risky,
    phone_valid: s.phone_valid,
    phone_high_risk_rate: s.phone_high_risk_rate,
    completeness_score: s.completeness_score,
    field_fill_rates: s.field_fill_rates,
    email_dupes: s.email_dupes,
    phone_dupes: s.phone_dupes,
    zoominfo_high_risk_rate: s.zoominfo_high_risk_rate,
    bad_zoominfo_contacts: s.bad_zoominfo_contacts,
    zoominfo_flagged_sample: [],
    source_breakdown: s.source_breakdown,
    high_risk_sample: [],
    col_guesses: { email: null, source: null, phone: null },
  };
}
