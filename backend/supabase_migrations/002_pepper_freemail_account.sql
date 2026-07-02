-- 002: domain_type (freemail flag) + account_id (distinct-customer gating).
--
-- Run once in the Supabase SQL editor after 001.
--
-- domain_type: 'freemail' (consumer mailbox: gmail, yahoo, ...) | 'corporate'.
--   Lets the benchmark exclude personal domains from sensitive/public surfaces.
--   (Decision 2026-06-16: "flag but keep".)
-- account_id: de-identified per-customer id (NOT PII). Required so the public
--   Vendor Index can enforce ">= 5 distinct customers" before showing a cell.
--   NULL until auth is wired — and while it's NULL the publish gate stays shut by
--   design (no cell can reach 5 distinct non-null accounts).

alter table public.vendor_signals add column if not exists domain_type text;
alter table public.vendor_signals add column if not exists account_id  text;

create index if not exists vendor_signals_account_idx
  on public.vendor_signals (account_id);

create index if not exists vendor_signals_source_type_idx
  on public.vendor_signals (source_normalized, domain_type);

-- NOTE on hashing: if the backend runs with REACHAUDIT_DOMAIN_HASH_PEPPER set,
-- domain_hash becomes HMAC-SHA256(pepper, domain) instead of plain SHA-256.
-- Same domain still hashes consistently, so aggregation is unchanged — but hashes
-- written with a pepper will NOT match hashes written without one. Enable the
-- pepper while this table is empty/early, and never rotate it.
