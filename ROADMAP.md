# ContactZen — Roadmap

> Living document. Source of truth for what comes next. Updated as work lands.

Last updated: **2026-06-10**

---

## Where we are right now

- ✅ Thesis locked (`DIRECTION.md`)
- ✅ Audit methodology locked (`METHODOLOGY.md`)
- ✅ Signal scoring engine, disposition field, set-disposition endpoint shipped (commit `c8ded64`)
- ✅ ROI scaled by actual bad-data rate (commit `7f0e62d`)
- ✅ HubSpot OAuth working, sandbox-tested
- ✅ Landing + /app + /pricing live on Vercel; FastAPI backend live on Railway
- 🔄 First pilot in motion

---

## Next 30 days — *Make the audit deliverable real*

The single highest-leverage move: turn what the code already computes into the **one-page audit report** the methodology prescribes.

- [ ] Audit existing code against `METHODOLOGY.md` — list the deltas (selling-time default, working-rate input, vendor attribution output, etc.)
- [ ] Implement the 4 levers + source map output in the API
- [ ] Build the report artifact — hosted HTML at `contactzen.io/reports/<token>`, PDF export
- [ ] Lock the "unreachable" definition end-to-end (one term, one calculation)
- [ ] Vendor attribution: support CSV upload with source field, map to known vendors (ZoomInfo, Apollo, Clay, manual)
- [ ] **Vendor Scorecard — cost per reachable contact (CPRC).** Spend input per detected vendor → total spend ÷ reachable contacts delivered, side-by-side across vendors, right-sized renewal line. Flagship metric per `DIRECTION.md` ("the buyer's side of the table"). Debuts in the pilot report.
- [ ] Demote credit recapture everywhere (landing, report, talk track) to one upside line — never the promise
- [ ] Deliver first pilot audit (IT leader, 1.5M contacts) — full report, full conversation
- [ ] Capture pilot reaction as case study material

**Deliverable at day 30:** a working hands-on audit motion. Joey can take a CSV, return a defensible one-page report, and run the executive conversation.

---

## Next 60 days — *Tighten + second pilot*

- [ ] Refine methodology based on what landed (and didn't) in pilot 1
- [ ] Templatize the audit process — checklist, fact-finder form, report shell
- [ ] First case study published (anonymized if needed)
- [ ] Pricing model shift: deprecate per-seat SaaS tiers, replace with audit + retainer
- [ ] Second pilot via the 30-year sales vet network — warm intro → audit
- [ ] Begin quarterly cadence with pilot 1 (the first recurring revenue line)

**Deliverable at day 60:** two completed audits, one case study, one recurring quarterly client.

---

## Next 90 days — *Repeatable motion*

- [ ] Third + fourth pilots (mix of warm network + first cold outreach off the case study)
- [ ] Automate the deterministic parts of the audit (verification pass, scoring, source attribution, report rendering) so each audit takes hours not days
- [ ] Build the client portal v1 — audits accumulate, trend line emerges
- [ ] Identify the highest-LTV ICP based on first 4 audits — refine targeting

**Deliverable at day 90:** ~4 audits delivered, ~$10–25K ARR, repeatable process, clear ICP signal.

---

## Beyond 90 days — *Phase 2: Productized audit*

- Automated audit pipeline (CSV in → report out, minimal founder time)
- Vendor scorecard product — comparative leaderboard across data providers
- Cross-provider reachability dataset begins to compound (the moat)
- HubSpot CRM card endpoint as an upsell layer for existing audit clients

## Long-term — *Phase 3: Continuous monitoring*

- Always-on reachability scoring against connected CRM
- Vendor decay alerts ("ZoomInfo data 30 days old has decayed 12% — credit-recapture conversation triggered")
- The moat is now obvious: no competitor can buy this dataset

---

## What we are explicitly NOT doing

- ❌ Building our own email verification engine (commodity, NeverBounce/ZeroBounce already do it cheaper)
- ❌ Enterprise sales cycles with procurement teams (ZoomInfo's new ground)
- ❌ Per-seat SaaS pricing tiers (misaligned with audit motion)
- ❌ Selling our own data (would compromise the neutral arbiter position)
- ❌ Hypergrowth / VC scale — the model targets durable $1–3M ARR
