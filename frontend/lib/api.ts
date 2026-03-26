import { ColumnsResponse, ROIInputs, ScanResult, ROIResult } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchColumns(file: File): Promise<ColumnsResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/api/columns`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function runScan(
  file: File,
  emailCol: string,
  sourceCol: string | null,
  phoneCol: string | null,
  roi: ROIInputs
): Promise<{ scan: ScanResult; roi: ROIResult }> {
  const form = new FormData();
  form.append("file", file);
  form.append("email_col", emailCol);
  if (sourceCol) form.append("source_col", sourceCol);
  if (phoneCol) form.append("phone_col", phoneCol);
  form.append("number_of_reps", String(roi.number_of_reps));
  form.append("emails_per_rep_per_week", String(roi.emails_per_rep_per_week));
  form.append("new_contacts_per_rep_per_week", String(roi.new_contacts_per_rep_per_week));
  form.append("cleanup_hours_per_rep_per_month", String(roi.cleanup_hours_per_rep_per_month));
  form.append("rep_hourly_cost", String(roi.rep_hourly_cost));
  form.append("annual_data_cost", String(roi.annual_data_cost));
  form.append("confidence_factor", String(roi.confidence_factor));

  const res = await fetch(`${API_URL}/api/scan`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function runHubSpotScan(
  accessToken: string,
  roi: ROIInputs
): Promise<{ scan: ScanResult; roi: ROIResult }> {
  const form = new FormData();
  form.append("access_token", accessToken);
  form.append("number_of_reps", String(roi.number_of_reps));
  form.append("emails_per_rep_per_week", String(roi.emails_per_rep_per_week));
  form.append("new_contacts_per_rep_per_week", String(roi.new_contacts_per_rep_per_week));
  form.append("cleanup_hours_per_rep_per_month", String(roi.cleanup_hours_per_rep_per_month));
  form.append("rep_hourly_cost", String(roi.rep_hourly_cost));
  form.append("annual_data_cost", String(roi.annual_data_cost));
  form.append("confidence_factor", String(roi.confidence_factor));

  const res = await fetch(`${API_URL}/api/scan/hubspot`, { method: "POST", body: form });
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
