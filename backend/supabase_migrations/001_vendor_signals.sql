-- ReachAudit Vendor Index — anonymized per-scan signal rows.
--
-- What we store: hashed email domain + declared source + verification outcome.
-- What we never store: raw email, name, phone, company, or any other PII.
--
-- Aggregating these rows across audits powers the public Vendor Index:
-- "ZoomInfo SaaS contacts under 500 employees have a 31% invalid rate, n=12,400 scans."
--
-- Run this once in the Supabase SQL editor before deploying the backend with
-- SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set.

create table if not exists public.vendor_signals (
  id              bigserial primary key,
  scan_id         uuid        not null,
  scanned_at      timestamptz not null default now(),

  -- SHA-256 of the lowercased email domain. Unsalted on purpose — aggregation
  -- across audits requires the same domain hashing the same way every time.
  domain_hash     text        not null,

  -- Canonical vendor key: zoominfo, apollo, linkedin, lusha, organic, ...
  -- "other" for vendors we don't yet recognize; "unknown" for missing source.
  source_normalized text      not null,
  source_raw      text,

  -- Outcome from scoring.email_risk: valid | risky | invalid | unknown | ...
  email_risk      text        not null,
  email_reason    text,
  phone_risk      text,

  -- Optional context, lowercased, capped at 80 chars.
  industry             text,
  company_size_bucket  text  -- 1-50 | 51-200 | 201-500 | 501-1000 | 1000+
);

-- Aggregation paths we care about:
--   "How does ZoomInfo perform overall?"           → source_normalized
--   "How does ZoomInfo perform for this domain?"   → (source_normalized, domain_hash)
--   "Time-windowed benchmark for the last 90d?"    → scanned_at
create index if not exists vendor_signals_source_idx
  on public.vendor_signals (source_normalized);

create index if not exists vendor_signals_domain_idx
  on public.vendor_signals (domain_hash);

create index if not exists vendor_signals_scanned_at_idx
  on public.vendor_signals (scanned_at desc);

create index if not exists vendor_signals_source_size_idx
  on public.vendor_signals (source_normalized, company_size_bucket);

-- RLS: only the service role inserts; reads are server-side only for now.
alter table public.vendor_signals enable row level security;

-- No anon/auth policies = no client can touch this table. The backend uses
-- the service_role key which bypasses RLS.
