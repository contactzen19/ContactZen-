import {
  ColumnsResponse,
  ROIInputs,
  ScanResult,
  ROIResult,
  AuditROIResult,
  SourceRow,
  VendorRollupRow,
  VendorScorecardResponse,
} from "./types";

export type ScanResponse = {
  scan: ScanResult;
  roi: ROIResult;
  audit_roi?: AuditROIResult;
  vendor_rollup?: VendorRollupRow[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function appendRoiFields(form: FormData, roi: ROIInputs) {
  form.append("number_of_reps", String(roi.number_of_reps));
  form.append("emails_per_rep_per_week", String(roi.emails_per_rep_per_week));
  form.append("new_contacts_per_rep_per_week", String(roi.new_contacts_per_rep_per_week));
  form.append("cleanup_hours_per_rep_per_month", String(roi.cleanup_hours_per_rep_per_month));
  form.append("rep_hourly_cost", String(roi.rep_hourly_cost));
  form.append("annual_data_cost", String(roi.annual_data_cost));
  form.append("loaded_ote", String(roi.loaded_ote));
  form.append("selling_time_pct", String(roi.selling_time_pct));
  form.append("list_coverage_pct", String(roi.list_coverage_pct));
  form.append("reply_rate", String(roi.reply_rate));
  form.append("mtg_to_deal_pct", String(roi.mtg_to_deal_pct));
  form.append("avg_contract_value", String(roi.avg_contract_value));
}

export async function fetchColumns(file: File): Promise<ColumnsResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/api/columns`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export interface EngagementCols {
  lastSendCol?: string | null;
  lastOpenCol?: string | null;
  lastReplyCol?: string | null;
}

export async function runScan(
  file: File,
  emailCol: string,
  sourceCol: string | null,
  phoneCol: string | null,
  roi: ROIInputs,
  engagement: EngagementCols = {}
): Promise<ScanResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("email_col", emailCol);
  if (sourceCol) form.append("source_col", sourceCol);
  if (phoneCol) form.append("phone_col", phoneCol);
  if (engagement.lastSendCol) form.append("last_send_col", engagement.lastSendCol);
  if (engagement.lastOpenCol) form.append("last_open_col", engagement.lastOpenCol);
  if (engagement.lastReplyCol) form.append("last_reply_col", engagement.lastReplyCol);
  appendRoiFields(form, roi);

  const res = await fetch(`${API_URL}/api/scan`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function runHubSpotScan(
  accessToken: string,
  roi: ROIInputs
): Promise<ScanResponse> {
  const form = new FormData();
  form.append("access_token", accessToken);
  appendRoiFields(form, roi);

  const res = await fetch(`${API_URL}/api/scan/hubspot`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function writebackToHubSpot(accessToken: string): Promise<{ updated: number; errors: number; total: number }> {
  const form = new FormData();
  form.append("access_token", accessToken);
  const res = await fetch(`${API_URL}/api/hubspot/writeback`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export interface ScoreResult {
  total_contacts: number;
  contacts_with_signals: number;
  engagements_processed: number;
  errors: number;
  tiers: { hot: number; warm: number; cold: number; dead: number };
  scored_at: string;
}

export interface TaskResult {
  hot_contacts: number;
  tasks_created: number;
  errors: number;
}

export async function scoreHubSpotContacts(accessToken: string): Promise<ScoreResult> {
  const form = new FormData();
  form.append("access_token", accessToken);
  const res = await fetch(`${API_URL}/api/hubspot/score`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createHotTasks(accessToken: string): Promise<TaskResult> {
  const form = new FormData();
  form.append("access_token", accessToken);
  const res = await fetch(`${API_URL}/api/hubspot/create-tasks`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export type DispositionValue =
  | "active"
  | "not_a_buyer"
  | "bad_timing"
  | "no_budget"
  | "unresponsive"
  | "do_not_contact";

export const DISPOSITION_LABELS: Record<DispositionValue, string> = {
  active:         "Active",
  not_a_buyer:    "Not a Buyer",
  bad_timing:     "Bad Timing",
  no_budget:      "No Budget",
  unresponsive:   "Unresponsive",
  do_not_contact: "Do Not Contact",
};

export async function setDisposition(
  accessToken: string,
  contactId: string,
  disposition: DispositionValue,
): Promise<{ contact_id: string; disposition: string; updated: boolean }> {
  const form = new FormData();
  form.append("access_token", accessToken);
  form.append("contact_id", contactId);
  form.append("disposition", disposition);
  const res = await fetch(`${API_URL}/api/hubspot/set-disposition`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchVendorScorecard(
  sourceBreakdown: SourceRow[],
  vendorSpend: Record<string, number>,
): Promise<VendorScorecardResponse> {
  const res = await fetch(`${API_URL}/api/vendor-scorecard`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_breakdown: sourceBreakdown, vendor_spend: vendorSpend }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function downloadFixed(
  file: File,
  emailCol: string,
  phoneCol: string | null,
  fixes: string[],
  exportType: "clean" | "suppression"
): Promise<Blob> {
  const form = new FormData();
  form.append("file", file);
  form.append("email_col", emailCol);
  if (phoneCol) form.append("phone_col", phoneCol);
  form.append("fixes", fixes.join(","));
  form.append("export_type", exportType);

  const res = await fetch(`${API_URL}/api/fix`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.blob();
}
