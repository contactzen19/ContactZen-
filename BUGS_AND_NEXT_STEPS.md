# Bugs and Next Steps

_Last updated: 2026-03-30_

## Current Stack
The app is a **Next.js frontend (Vercel) + FastAPI backend (Railway)**. The old Streamlit `app.py` is no longer in use. All issues below are relevant to the live Next.js/FastAPI stack.

---

## Known Issues to Test

### 1. HubSpot writeback — end-to-end not fully verified
- The writeback endpoint and UI were just added (last commit: `57f609a`)
- OAuth flow works and is sandbox-tested, but writing scores back to real HubSpot contacts has not been confirmed in a real session
- **To test:** Connect HubSpot, run a scan, attempt to write scores back — confirm the API call succeeds and properties appear in HubSpot

### 2. Demo mode CSV size
- `/app?demo=true` loads `demo_contacts.csv` from the public folder
- Multiple demo CSVs exist: `demo_contacts.csv`, `demo_contacts_500k.csv`, `demo_contacts_50k.csv`
- **Verify:** The demo loads fast enough to not feel slow; the numbers in the output are compelling (20–40% bad data)

### 3. Shareable report link — payload size
- Report data is base64-encoded into the URL as `?d=...`
- Large scans could produce very long URLs that break in some clients (email, Slack)
- **To test:** Generate a report link after a large scan and paste it into Slack/email to confirm it works

### 4. Supabase auth on /scans page
- Several Supabase crash fixes were landed recently (`f082b7b`, `075672a`, `8eed252`, `31e3563`)
- **Verify:** Sign in, save a scan, navigate to `/scans` — confirm no crash and history renders correctly

### 5. Mobile/responsive layout
- ROI sidebar is hidden on small screens (`hidden lg:block`) but the rest of the layout has not been thoroughly tested on mobile
- **To test:** Load `/app?demo=true` on a phone or narrow browser window — check readability of results sections

---

## Confirmed Working
- CSV upload → column detection → scan → results (email risk, phone risk, source attribution, ROI, completeness, dupes)
- Executive Summary, RevOps Breakdown, At-Risk Records, Fix & Export sections
- Shareable report links (`/report?d=...`)
- HubSpot OAuth connect flow
- Supabase auth (sign in / sign up)
- Save scan + My Scans history page
- Pricing page
- Landing page + lead capture form (Formspree → contactzen.joey@gmail.com)
- Book a Call button (Calendly)

---

## Next Build Priorities

### Short-term (demo-readiness)
1. Verify HubSpot writeback end-to-end with a real or sandbox HubSpot account
2. Confirm demo mode feels fast and numbers tell a compelling story
3. Check shareable report links hold up in Slack/email

### Phase 2 — HubSpot depth
1. Prospect disposition engine — one-click Hot/Warm/Cold/Not a Buyer tagging, written back to HubSpot as custom contact properties
2. Behavioral intent scoring — pattern-based (not point-accumulation), surfaces daily rep priority list
3. Clean activity feed — rep-only view filtering out automated touches

### Phase 3 — Platform
1. Contact recovery engine — suppressed contacts → verified replacement → reactivated in HubSpot
2. Continuous CRM health monitoring (not just one-time scan)
3. Salesforce integration

---

## Rules for Fixes
- Smallest reliable fix first
- Identify exact failing line before touching anything
- After each fix, test with demo mode and a real CSV
- Preserve demo value over code elegance
