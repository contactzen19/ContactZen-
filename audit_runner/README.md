# ReachAudit Audit Runner

The internal machine that turns a customer's list into the audit deliverable.
Spec: `../ReachAudit_Audit_Runner_Spec_Phase1_2026-07-10.md`. Status: **M1–M3
built** (ingest + email verify + phone/DNC + analyze/roadmap). M4 report
draft, M5 monthly delta — not yet.

One run now produces: `audit_summary.txt` (the numbers incl. per-vendor CPRC
when `vendor_spend` is in client.yaml), `evidence.csv` (record-by-record
verdicts), and `<Client>_Action_Roadmap.xlsx` (tiered call list, five tabs,
same format as the first customer deliverable — now with verified line type
and DNC gating every call action). Live outputs land in `deliver/`; mock
outputs are suffixed `_MOCK` and stay in `work/`.

## Run an audit

From this folder:

```
cd ~/ContactZen/audit_runner
python3 run_audit.py --client elaine --list ~/Downloads/july_list.csv --dry
```

`--dry` = cost preview, spends nothing. When the numbers look right:

```
python3 run_audit.py --client elaine --list ~/Downloads/july_list.csv
```

First run for a new client asks a couple of setup questions and saves them to
`clients/<name>/client.yaml`. Every run after that asks nothing new.

Crashed or out of credits mid-run? Just re-run the same command. The
checkpoint means already-verified emails are never paid for twice.

## Where things land

```
clients/elaine/
  client.yaml        <- per-client settings (edit by hand any time)
  2026-07/
    input/           <- their raw file, untouched
    work/            <- master.csv, zb_checkpoint.jsonl, zb_results.csv
    deliver/         <- (M4) the customer-facing bundle
```

`clients/` is gitignored. Client data never goes in git.

## Phone + DNC (built in M2)

Runs automatically as step 3 unless you pass `--skip-phone`. Three safety
gates, in order:

1. **SAN gate.** The client's `client.yaml` must have all three SAN values
   (from donotcall.gov, never guessed), unexpired:

   ```
   san:
     organization_id: "..."
     san_number: "..."
     san_expiration: "YYYY-MM-DD"
   ```

   RPV can't take a SAN per request, so the runner also asks you to confirm
   the RPV account is currently switched to THIS client's SAN.
2. **10-number wiring test.** A client's first-ever live run looks up 10
   numbers, shows the verdicts, and asks if they look right before spending
   on the rest.
3. **LOOKUP_FAILED is never safe.** Failed lookups are flagged loudly;
   re-running resumes and only pays for what's missing.

After a live phone run the compliance-record JSON lands in `deliver/` and
`client.yaml` gets the 31-day `next_rescrub` date.

**Testing without a token or credits:** add `--mock-phone`. Lookups are
faked, outputs are suffixed `_MOCK`, no compliance record is written, and
nothing can end up in a customer deliverable.
