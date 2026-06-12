import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

// Auth UI is hidden unless explicitly enabled. The Supabase free-tier
// project pauses when idle, which kills sign-in at the network level;
// keep the doors closed until a pilot needs saved scans.
export function authEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_ENABLED === "true" && getSupabase() !== null;
}

export function getSupabase(): SupabaseClient | null {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !url.startsWith("https://")) return null;
  try {
    _client = createClient(url, key);
    return _client;
  } catch {
    return null;
  }
}
