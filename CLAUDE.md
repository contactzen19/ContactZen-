# ReachAudit Project Rules

## Product
ReachAudit is an independent reachability audit tool for RevOps and sales teams.
Primary MVP focus:
1. Scan uploaded CSVs
2. Validate emails
3. Score contact risk
4. Attribute bad data by source
5. Show ROI / waste impact
6. Export cleanup-ready output

## Current Stack
- Python
- Streamlit
- pandas
- email-validator

## Priorities
1. Stable demo experience
2. Clear executive summary and ROI
3. Source attribution by vendor/source
4. Add phone health after core email flow is solid

## Coding Preferences
- Make the smallest safe change first
- Do not rewrite large sections unless necessary
- Explain root cause before major refactors
- Preserve working UI unless asked otherwise
- Prefer readable, simple code over clever abstractions
- When fixing bugs, identify exact failing line and dependency chain
- Suggest tests for each fix

## Workflow
- Before editing, inspect relevant files first
- After editing, recommend exact command to run
- When multiple fixes are possible, choose the fastest reliable option
- Keep app demo-friendly and business-facing

## Important Business Context
The wow factor is not just validation.
It is:
- showing how much bad data exists
- showing where it came from
- quantifying wasted spend and rep time
- helping support vendor credit recapture conversations