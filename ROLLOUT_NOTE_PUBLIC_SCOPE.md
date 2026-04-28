# Rollout Note - Public Data Scope

## What Changed

- Frontend now prioritizes publicly feasible mine details in the detail modal.
- Sensitive/non-public operational fields are not shown as mandatory visible content.
- Dataset normalization and validation are aligned with public-first delivery constraints.

## Validated

- Python syntax check passed:
  - `scripts/storage.py`
  - `scripts/daily_refresh.py`
  - `scripts/validate_data.py`
  - `api/server.py`
- Static diagnostics show no editor/linter errors in edited files.

## Risks

- Local end-to-end data validation is blocked without `DATABASE_URL`.
- Coverage for public fields depends on source availability and source stability.
- Some mines will continue showing partial details until source extraction expands.

## Follow-Ups

- Run `python3 scripts/validate_data.py` in an environment with valid `DATABASE_URL`.
- Execute focused UI checks with live API data (search + map + detail modal).
- Implement field-level provenance and status reporting in API payloads.
