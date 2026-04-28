# Data And Search Recovery Checklist

Use this file as the single tracking reference for the current recovery plan.

## Phase 1 - Immediate UX And Search Fixes

- [x] Normalize free-text search (case/accents) in frontend.
- [x] Expand search index to include location-like fields when present.
- [x] Update UI copy to clarify "results depend on available data quality".
- [x] Improve visibility of "available concessions only" mode state.
- [ ] Run quick manual verification scenarios and record outcomes.

## Phase 2 - Dataset Enrichment Baseline

- [x] Complete migration to canonical dataset field names in English only (no Spanish aliases).
- [ ] Define enrichment fields for each record:
  - `data_origin`
  - `confidence_score`
  - `enriched_at`
- [ ] Add override source (manual trusted corrections) for key records.
- [ ] Merge overrides during refresh cycle without breaking existing flow.
- [ ] Add reverse geocoding path for `city/commune` enrichment.
- [ ] Keep provenance per enriched field (official/manual/inferred).

## Phase 3 - Concessions Reliability

- [ ] Define business rule for `is_available_concession` (single source of truth).
- [ ] Add source strategy for concession status (official/manual fallback).
- [ ] Surface reliability badges in frontend.
- [ ] Report coverage metrics after each refresh:
  - `% with city`
  - `% with mining company`
  - `% with reliable concession status`

## Validation And Release

- [ ] Run data validation script after changes.
- [ ] Run focused UI checks for search and concession map behavior.
- [ ] Update README if data contract or fields change.
- [ ] Prepare a short rollout note with risks and follow-ups.
