# ReachAudit Vendor Index — Capture Schema (spec)

> Drafted 2026-06-15. The moat is not the verification step (that's commodity —
> anyone can wrap ZeroBounce). The moat is a proprietary, **accumulating**
> dataset of reachability outcomes that no single-email verifier can build,
> because a verifier checks one inbox at a point in time and never sees where
> the contact came from or how it behaves across clients.
>
> Every audit should make the next one sharper. This doc specs the fields that
> make that compounding actually happen.

---

## What already exists (the skeleton)

This is not a from-scratch build. The foundation is in the repo:

- **`backend/vendor_signals.py`** — writes one PII-free row per contact to
  Supabase on each scan: hashed email domain, normalized vendor/source,
  `email_risk` outcome, industry, company-size bucket. Best-effort; a Supabase
  failure never breaks a scan.
- **`backend/supabase_migrations/001_vendor_signals.sql`** — the `vendor_signals`
  table + indexes + RLS (service-role insert only, no client reads).
- **`backend/analysis.py`** (`compute_scan`) — per-source attribution, per-source
  unreachable rates, and the vendor-neutral "worst paid vendor" evidence file.
- **`backend/vendor_scorecard.py`** — `_vendor_key` paid/free vendor mapping.

What's missing is **ground truth** and a few **dimensional fields**. That's this
spec.

---

## Core principle: store the prediction AND the truth

Today we store our *prediction* (`email_risk`, a syntax/MX-level guess). The
index's credibility comes from **what actually happened** — did the mailbox
exist, did it bounce. Without a truth column the index only measures "syntax
validity by vendor," which is weak.

With both side by side we get two assets at once:

1. The headline nobody else can compute: *"ZoomInfo's real, verified
   reachability is 71%, not the 95% they self-grade."*
2. Our own model accuracy: *"the free ReachAudit layer agrees with paid
   verification 94% of the time"* — a trust asset for the report and the site.

**Live proof, 2026-06-15:** 22 prospect emails were MX-valid (domain accepts
mail). 9 of 14 sent hard-bounced — a 64% mailbox-level miss the free layer could
not see. That gap *is* the product thesis, and it is exactly what this table
must record.

---

## Schema v2 — fields to add to `vendor_signals`

All additive. No change to the free scan path. Same PII-free posture (hashed
domain only; never raw email/name/phone/company).

| Column | Type | Source | Moat angle it unlocks |
|---|---|---|---|
| `mx_status` | text | Layer-2 MX (already computed, currently discarded as a bool) | provider-level reachability |
| `mailbox_status` | text | verification API: `valid` / `invalid` / `catch_all` / `unknown` | **verified vendor index** |
| `verify_vendor` | text | `zerobounce` / `neverbounce` / null | provenance of the truth |
| `bounced` | bool | real send outcome (CRM bounce log or live send); null if never sent | ground-truth loop |
| `outcome_source` | text | `predicted` / `verified_api` / `crm_bounce_log` / `live_send` | trust level per row |
| `verified_at` | timestamptz | when truth was recorded | accuracy-over-time |
| `role_bucket` | text | title → `c_level`/`vp`/`director`/`manager`/`ic`/`sales_rep`/`unknown` | **decay half-life by role** |
| `contact_age_bucket` | text | CRM created/acquired date → `<6mo`/`6-12mo`/`1-2y`/`2-4y`/`4y+` | **acquisition-cohort rot** |
| `mail_provider` | text | MX host → `google`/`m365`/`proofpoint`/`mimecast`/… | **pattern-by-ESP**, provider benchmarks |
| `is_catch_all` | bool | domain returns valid-for-anything | **catch-all registry**, "your valid count is fiction" |
| `abandoned_inbox` | bool | already computed in `analysis.py` as `_cz_abandoned`, just not stored | engagement-decay benchmark |
| `email_pattern` | text | shape only: `first.last`/`flast`/`f.last`/`other` — **never the value** | pattern-learning to sharpen prediction |

---

## Companion table: `domain_intel`

A small derived table so we stop re-probing the same domains and start *owning*
domain-level facts. Every audit enriches it; it is pure proprietary asset.

```sql
create table if not exists public.domain_intel (
  domain_hash       text primary key,   -- SHA-256 of lowercased domain (same as vendor_signals)
  mail_provider     text,
  is_catch_all      boolean,
  first_seen        timestamptz not null default now(),
  last_seen         timestamptz not null default now(),
  observation_count integer     not null default 1
);
```

This is what makes the catch-all registry and provider benchmarks compound
instead of being recomputed every scan.

---

## Proposed migration sketch (`002_vendor_signals.sql`)

```sql
alter table public.vendor_signals
  add column if not exists mx_status          text,
  add column if not exists mailbox_status     text,
  add column if not exists verify_vendor      text,
  add column if not exists bounced            boolean,
  add column if not exists outcome_source     text,
  add column if not exists verified_at        timestamptz,
  add column if not exists role_bucket        text,
  add column if not exists contact_age_bucket text,
  add column if not exists mail_provider       text,
  add column if not exists is_catch_all       boolean,
  add column if not exists abandoned_inbox    boolean,
  add column if not exists email_pattern      text;

create index if not exists vendor_signals_mailbox_idx
  on public.vendor_signals (source_normalized, mailbox_status);
create index if not exists vendor_signals_role_idx
  on public.vendor_signals (role_bucket);
create index if not exists vendor_signals_provider_idx
  on public.vendor_signals (mail_provider);
```

`build_signal_rows()` in `vendor_signals.py` gets the matching new keys; all
default to null when the upstream signal isn't present.

---

## Capture discipline (the part that's easy to get wrong early)

Three rules that decide whether the dataset compounds or fragments:

1. **Always write the row, even when truth columns are null.** Absence is data:
   "never verified" and "verified invalid" are different facts.
2. **Normalize through fixed vocab maps.** We already do this for `source`
   (`SOURCE_ALIASES`). Do the same for `role_bucket` and `mail_provider` so
   aggregation stays clean across thousands of audits. Unknown → an explicit
   bucket, never a free-text leak.
3. **Store prediction and truth side by side** (see core principle). Never
   overwrite the prediction with the verified result — keep both.

---

## The angles this enables (each is one query)

| Angle | Aggregation | The line it produces |
|---|---|---|
| Vendor reachability index | `source_normalized` × `mailbox_status` | "ZoomInfo verified reachability: 71% (n=…)" |
| Decay half-life by role | `role_bucket` × `bounced` × `contact_age_bucket` | "an SDR email dies in ~9 mo; a CFO in ~3 yr" |
| Acquisition-cohort rot | `source_normalized` × `contact_age_bucket` | "your 2022 vendor pull is 41% dead, 2024 is 12%" |
| Catch-all exposure | `is_catch_all` share of "valid" | "31% of your 'valid' contacts are at catch-all domains" |
| Pattern-by-ESP | `mail_provider` × `email_pattern` × `bounced` | sharpens prediction so future lists bounce less |
| Model accuracy | `email_risk` vs `mailbox_status` | "free layer agrees with paid verification 94% of the time" |

---

## Backfilling known outcomes

Real-world outcomes that don't arrive via a CSV scan (our own cold outreach, a
client's bounce export) should still feed the index. Add a thin helper:

```python
def log_known_outcome(email, source, *, bounced=None, mailbox_status=None,
                      outcome_source="crm_bounce_log"): ...
```

so data points like the 9 bounces from 2026-06-15 aren't lost.

---

## Rollout

Ships dark behind the existing `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
flag (`VENDOR_SIGNALS_ENABLED`). No change to the free scan path, no UI change,
no new PII. Turn on capture first; build the public Vendor Index page only once
`n` is large enough to be credible.

## Privacy posture (unchanged)

Hashed domain only. No raw email, name, phone, or company ever stored. Unsalted
domain hash on purpose — aggregation across audits needs the same domain to hash
the same way every time. RLS keeps the table server-side only.
