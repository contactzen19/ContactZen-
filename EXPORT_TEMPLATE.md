# ContactZen — Audit Export Template

Export a contact CSV from your CRM with the columns below to run the full reachability audit. ContactZen processes the file in memory and never stores contact-level records.

**Sample file**: [contactzen-export-template.csv](frontend/public/contactzen-export-template.csv)

---

## Required column

- `email` — the address you actually reach out to

That's the minimum. Everything below makes the audit sharper.

## Strongly recommended — unlocks the full methodology

| Column | What it powers |
|---|---|
| `last_email_send_date` | Abandoned-inbox detection |
| `last_email_open_date` | Abandoned-inbox detection |
| `last_email_reply_date` | Abandoned-inbox detection |
| `source` (or `lead_source`) | Source Map + vendor credit recapture |

**Why these matter.** The three engagement columns power the **abandoned-inbox bucket** — contacts you keep emailing but who've gone silent for 12+ months. This is the reachability layer that NeverBounce and other validators cannot see. `source` powers the **Source Map** — vendor-by-vendor breakdown that supports renewal-time credit recapture against ZoomInfo, Apollo, Cognism, and similar providers.

## Optional — improves completeness scoring

- `first_name`, `last_name`, `company`, `title`, `phone`

## What we do NOT need

- Notes, deal data, custom fields, internal IDs
- Engagement *content* (subject lines, message bodies) — only timestamps
- Anything beyond the columns listed above

---

## Date format

ISO 8601 preferred (`2026-04-15` or `2026-04-15T10:30:00Z`). Most common date formats are accepted; unparseable values are treated as missing.

## Column name flexibility

ContactZen auto-detects common variants — you don't have to rename anything before exporting:

- Email: `email`, `email_address`, `work_email`, `emailaddress`
- Source: `source`, `lead_source`, `contact_source`, `data_source`
- Phone: `phone`, `mobile_phone`, `work_phone`, `direct_phone`, `phone_number`
- Last send: `last_email_send_date`, `last_email_sent_date`, `last_sent_date`, `hs_email_last_send_date`
- Last open: `last_email_open_date`, `last_email_opened_date`, `last_opened_date`, `hs_email_last_open_date`
- Last reply: `last_email_reply_date`, `last_email_replied_date`, `last_replied_date`, `hs_email_last_reply_date`

---

## Export hints by CRM

**HubSpot**: Contacts → list view → Actions → Export. Properties to add: Email, Last Marketing Email Send Date, Last Marketing Email Open Date, Last Marketing Email Reply Date, Original Source Type, First Name, Last Name, Company, Job Title, Phone.

**Salesforce**: Reports → New Report → Contacts. Add columns: Email, Last Activity Date, Lead Source. Engagement-specific dates may require a custom report pulled from Pardot or Marketing Cloud.

**Outreach**: People → Filters → Export. Pull Email, Source, plus engagement timestamps from the prospect view.

**Apollo**: People → Save Search → Export. Include email + last-engagement fields.

**Dialer-native CRMs (PhoneBurner, Velocify, RingDNA, etc.)**: Engagement timestamps may be limited. Even without them, source attribution + hard-bounce + catch-all detection still runs — you'll see 2 of 4 unreachability buckets populated and the full Source Map.

---

## Minimum viable export

If your CRM cannot produce engagement dates, send `email` + `source` + name/company. You'll still get hard-bounce + catch-all detection, source attribution, and full ROI — roughly 90% of the demo value, minus the dormant-inbox layer.

## Privacy

The file is processed in memory and discarded after the scan. No contact-level records are persisted. Aggregate counts and percentages are kept for the report artifact only.
