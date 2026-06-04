# ContactZen Architecture

## Current App Structure
This project is a Streamlit app for scanning CSV contact files and producing business-friendly outputs.

## Known Core Components
- `app.py`
  - Main Streamlit UI
  - file upload flow
  - column selection
  - scan trigger
  - dashboard rendering
  - ROI inputs and summary

- `contact_validator.py`
  - email validation logic
  - status classification logic
  - possibly risk scoring helpers

- `bulk_validate.py`
  - batch processing helpers for uploaded records
  - may support scanning or dataframe-level transformations

## Current Workflow
1. User uploads CSV
2. App loads dataframe
3. App guesses email column
4. User can select source column and phone column if available
5. User runs scan
6. Scan computes validation results and risk outputs
7. App renders summary tabs and exportable results

## Current Product Logic
The main business logic includes:
- email validation
- risk classification
- source attribution
- summary metrics
- ROI estimation
- cleanup/export workflow

## Engineering Goal
Keep architecture simple for MVP speed.

Do not over-engineer. Favor:
- stable scan flow
- readable functions
- predictable dataframe transformations
- easy debugging
- demo-safe UI behavior