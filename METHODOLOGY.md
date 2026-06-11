# ContactZen Reachability Audit — Methodology

> Internal playbook. Source of truth for what goes into the audit report and the order it is presented in.

---

## The Finding (one number)

**"X% of the contacts in your CRM cannot be reached."**

Locked definition of *unreachable*: a contact that would not produce a human reply if outreach were attempted. Specifically:

- Hard bounces
- Role changes / departed employees
- Abandoned inboxes (no opens 12+ months despite delivery)
- Catch-all noise (domain accepts everything, reaches no one)

Single definition, no synonyms. Everything downstream converts this percentage to dollars.

---

## Lever 1 — Wasted Rep Capacity *(the headline)*

```
Reps × Loaded OTE × Selling-Time% × Unreachable%
```

**Defaults:**
- `Selling-Time%` = **35%** *(SBI / RAIN Group industry actuals — conservative on purpose so a CFO cannot pick the number apart)*

Worked example: 25 reps × $75K × 35% × 40% = **$262,500 / yr** in paid capacity spent on ghosts.
Per rep ≈ **$10,500 / yr**. Scales with headcount, hits their own payroll. This is the line that stops the room.

---

## Lever 2 — Recoverable Pipeline *(the upside)*

```
(Unreachable contacts × % of list actually worked) × Reply% × Mtg→Deal% × ACV
```

`% of list actually worked` (rep coverage) is new vs. v1 — without it, Lever 2 inflates against any list larger than reps can touch. Default 40% if unknown.

> **Critical framing rule — do not stack Levers 1 + 2.** Same rep-hours produce one or the other. Present as a choice, not a sum:
>
> *"Either you're paying $262K for ghosts, or you redirect those hours and get $X in pipeline. Same dollars, two ways to see them."*
>
> A CFO who senses double-counting walks. Pre-empt it.

---

## Lever 3 — Wasted Data Spend *(the footnote)*

```
Annual data spend × Unreachable%
```

Real but small at per-seat pricing ($0.06–$0.12 per credit). Mentioned last for completeness. Never the lead.

---

## The Source Map *(the differentiator)*

> *"62% of your unreachable contacts came from ZoomInfo. 18% from Apollo. 12% from Clay. 8% from manual entry."*

This line is the entire reason ContactZen is not a generic email-verification report. No data vendor can publish it (conflict of interest). It powers:

- the renewal conversation (cost per reachable contact, right-sized contract)
- vendor scoring at procurement
- the recurring quarterly cadence (which vendor is degrading fastest?)
- where contracts include data-quality terms, a credit conversation — upside, never the promise

The audit is incomplete without it. First-class deliverable, not a side note.

---

## Cost per Reachable Contact — CPRC *(the renewal number)*

```
CPRC = total vendor spend ÷ reachable contacts delivered (per vendor)
```

Pricing-model-agnostic: spend is whatever the buyer pays per year — seats, credits,
usage, or per-lead. Computed entirely from the buyer's own file plus their contract
number. Requires nothing from the vendor.

Derived lines, all arithmetic:
- **Reachability premium** = (CPRC − cost per contact) ÷ cost per contact
- **Right-sized spend** = annual spend × reachable rate *(what the same contract is worth if you only pay for contacts that are real)*
- **Overpay** = annual spend − right-sized spend

**The armor rule:** a vendor's only counter to CPRC is attacking the definition of
*reachable*. The locked definition (top of this document) travels inline wherever
the number appears — report, app, conversation. Win that fight before it starts.

For lead-buying shops (per-lead pricing, ongoing purchasing instead of annual
renewals), present the same metric as **cost per reachable lead** — and the
right-sizing is immediate: they can reallocate next month's lead budget, no
renewal date required.

---

## The Multiplier — Deliverability Risk *(the fear)*

Not a dollar line. The fear that closes.

As of **February 2024**, Google and Yahoo enforce bulk-sender bounce rates **< 0.3%**. Above ~5% is blacklist territory — which throttles *every rep's* outbound at once, including the good contacts.

If their unreachable % exceeds 5%, they are already self-throttling and do not know it.

---

## Presentation Order

1. **The finding** — single % unreachable.
2. **Lever 1** — wasted rep capacity, the headline dollar figure.
3. **The source map** — who delivered the dead data.
4. **CPRC / Vendor Scorecard** — what they actually pay per reachable contact, and the right-sized number.
5. **Lever 2** — pipeline recoverable, framed as choice not sum.
6. **Deliverability multiplier** — the fear.
7. **Lever 3** — wasted spend, footnote for completeness.

---

## Inputs Required

| Input | Source | Fallback if missing |
| --- | --- | --- |
| # reps | fact finder | LinkedIn headcount × 30% |
| Loaded OTE | fact finder | $75K SDR / $150K AE blended |
| Unreachable % | audit output | — |
| Vendor source per contact | CRM source field / file metadata | flag as "Unknown" |
| % of list actually worked | sequencer data | 40% |
| Reply rate | fact finder | 1.5% |
| Mtg → Deal % | fact finder | 20% |
| ACV | fact finder | — |
| Annual data spend | fact finder | — |

Anything estimated is **flagged as an estimate in the report.** Never silently default — every assumption is visible to the reader.

---

## Two Channels, Two Scripts

- **Verbal pitch** — the "managed out for a data problem" origin story lands here. Insight, not grievance.
- **Written report** — origin story does not appear. The deliverable goes to executives who have never met the founder. About their numbers, not the founder's.
