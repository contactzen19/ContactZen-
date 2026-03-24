# Bugs and Next Steps

## Current Goal
Improve demo stability and remove recurring blockers that slow development.

## Recent Issues Seen
1. `name 'source_col' is not defined`
   - likely caused by variable order or assignment before UI selection is complete

2. `KeyError` or missing key around:
   - `scan["contact_high_risk_rate"]`
   - likely mismatch between expected scan output schema and actual returned keys

3. indentation / structure issues in `app.py`
   - likely caused by manual patching during rapid edits

4. missing or incomplete environment setup
   - `requirements.txt` may not exist or be incomplete

## Immediate Priorities
1. Stabilize scan output contract
   - make sure `compute_scan()` always returns a predictable dictionary shape
   - document expected keys clearly

2. Stabilize variable initialization in `app.py`
   - ensure `source_col`, `phone_col`, and `email_col` are safely initialized before use

3. Reduce fragile UI logic
   - avoid scattered logic that depends on variables being defined in multiple places

4. Add defensive checks
   - show user-friendly messages when required columns or outputs are missing

## Suggested Next Build Order
1. inspect and document actual `compute_scan()` return schema
2. fix variable initialization flow in `app.py`
3. clean up summary rendering assumptions
4. confirm app runs on a sample CSV without errors
5. add one clean and one messy sample CSV for repeat testing

## Rules for Fixes
- prioritize smallest reliable fix
- do not refactor large areas unless root cause requires it
- after each fix, test with a real CSV
- preserve demo value over code elegance