// Portal data access — reads only. The portal displays what publish.py
// published; it never computes numbers (methodology stays in the runner).
import { getSupabase } from "./supabase";

export interface PortalClient {
  id: string;
  slug: string;
  name: string;
  next_rescrub: string | null;
}

export interface AuditDelta {
  previous?: string;
  went_dead?: number;
  new_dnc?: number;
  email_died?: number;
  new_contacts?: number;
  gone_contacts?: number;
}

export interface PortalAudit {
  id: number;
  client_id: string;
  stamp: string;
  score: number | null;
  verdicts: Record<string, number> | null;
  tiers: Record<string, number> | null;
  delta: AuditDelta | null;
  published_at: string;
}

export interface PortalDoc {
  name: string;
  bucket: "portal-docs" | "transit";
  url: string | null; // null = transit window lapsed, "request download"
}

export async function myClients(): Promise<PortalClient[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("portal_clients")
    .select("id, slug, name, next_rescrub")
    .order("name");
  if (error) { console.error("myClients:", error); return []; }
  return data ?? [];
}

export async function listAudits(clientId: string): Promise<PortalAudit[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("audits")
    .select("id, client_id, stamp, score, verdicts, tiers, delta, published_at")
    .eq("client_id", clientId)
    .order("stamp", { ascending: false });
  if (error) { console.error("listAudits:", error); return []; }
  return data ?? [];
}

// Stored docs (report, compliance record) download instantly. Transit files
// (evidence, roadmap) get a signed link while they exist; once purged the
// portal shows "request download" and Joey re-publishes from his local copy.
export async function listDocs(clientId: string, stamp: string): Promise<PortalDoc[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const docs: PortalDoc[] = [];
  for (const bucket of ["portal-docs", "transit"] as const) {
    const prefix = `${clientId}/${stamp}`;
    const { data, error } = await sb.storage.from(bucket).list(prefix);
    if (error || !data) continue;
    for (const f of data) {
      if (!f.name || f.name.startsWith(".")) continue;
      const { data: signed } = await sb.storage
        .from(bucket)
        .createSignedUrl(`${prefix}/${f.name}`, 60 * 60); // 1h is plenty for a click
      docs.push({ name: f.name, bucket, url: signed?.signedUrl ?? null });
    }
  }
  return docs;
}
