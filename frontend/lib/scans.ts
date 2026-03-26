import { getSupabase } from "./supabase";
import { ReportSummary } from "./report";

export interface SavedScan {
  id: string;
  created_at: string;
  label: string | null;
  summary: ReportSummary;
}

export async function saveScan(summary: ReportSummary, label?: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data, error } = await sb.from("scans").insert({ user_id: user.id, label: label ?? null, summary }).select("id").single();
  if (error) { console.error("saveScan:", error); return null; }
  return data.id;
}

export async function listScans(): Promise<SavedScan[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("scans").select("id, created_at, label, summary").order("created_at", { ascending: false }).limit(20);
  if (error) { console.error("listScans:", error); return []; }
  return data ?? [];
}

export async function deleteScan(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("scans").delete().eq("id", id);
}
