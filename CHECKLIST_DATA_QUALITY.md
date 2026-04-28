# Data And Search Recovery Checklist

Use this file as the single tracking reference for the current recovery plan.

Reference note:

- `PUBLIC_DATA_FEASIBILITY_NOTE.md` defines what is feasible from public sources and what is sensitive/non-public.

Execution rule:

- [ ] Each completed task in this checklist must be finalized with its own focused commit.

## Mandatory Mine Detail Data (Critical)

The following fields are now mandatory for each mine/deposit record and must be present with real, traceable data (not placeholders):

- [ ] `mining_company` (operator company)
- [ ] `direct_workers`
- [ ] `indirect_workers`
- [ ] `average_salary`
- [ ] `annual_revenue`
- [ ] `operation_since`
- [ ] `hiring_plan_2026`
- [ ] `operating_authorizations`
- [ ] `geology_studies`
- [ ] `mineral_life_studies`
- [ ] `mitigation_studies`
- [ ] `environmental_reports`
- [ ] `website`

Acceptance rule:

- [ ] Do not mark a record as complete unless all mandatory fields have source links and update date.

## Phase 1 - Immediate UX And Search Fixes

- [x] Normalize free-text search (case/accents) in frontend.
- [x] Expand search index to include location-like fields when present.
- [x] Update UI copy to clarify "results depend on available data quality".
- [x] Improve visibility of "available concessions only" mode state.
- [ ] Run quick manual verification scenarios and record outcomes.

## Phase 2 - Dataset Enrichment Baseline

- [x] Migrate persistence to relational SQL + ORM (no JSON app_state storage, no legacy fallback).
- [x] Complete migration to canonical dataset field names in English only (no Spanish aliases).
- [x] Define enrichment fields for each record:
  - `data_origin`
  - `confidence_score`
  - `enriched_at`
- [x] Add override source (manual trusted corrections) for key records.
- [x] Merge overrides during refresh cycle without breaking existing flow.
- [x] Add reverse geocoding path for `city/commune` enrichment.
- [x] Keep provenance per enriched field (official/manual/inferred).

## Phase 2.1 - Mandatory Data Acquisition Plan

- [x] Define source priority matrix per mandatory field (official source first, then regulated reports, then verified corporate disclosures).
- [x] Create source catalog per record with stable URL and extraction method:
  - `source_name`
  - `source_url`
  - `field_coverage`
  - `last_checked_at`
- [x] Build extractor rules for structured sources (tables/CSV/API/PDF where possible).
- [ ] Build manual curation queue for records that fail automatic extraction.
- [ ] Store field-level provenance:
  - `field_name`
  - `field_value`
  - `source_url`
  - `source_type`
  - `confidence_score`
  - `updated_at`
- [ ] Add hard validation gate: fail refresh if mandatory-field coverage drops below agreed threshold.
- [ ] Publish coverage KPIs each refresh:
  - `% records with all mandatory fields`
  - `% records with official source`
  - `% records pending manual curation`

## Phase 2.2 - Execution Sequence

- [x] Sprint 1: source matrix + schema + provenance model.
- [ ] Sprint 2: automatic extraction for top fields (company, website, authorizations, reports).
- [ ] Sprint 3: extraction for workforce/salary/revenue/operation_since/hiring_plan_2026.
- [ ] Sprint 4: geology/mineral-life/mitigation studies + QA and gap closure.
- [ ] Sprint 5: production hardening (alerts, quality thresholds, rollback policy).

## Field Source Playbook (Concrete)

- [ ] `mining_company`:
  - Primary: official company site (operations/mines pages).
  - Secondary: annual reports and investor filings.
  - Validation: company name must match operation context and source date.
- [ ] `website`:
  - Primary: official corporate domain only.
  - Validation: reachable URL + domain consistency with operator name.
- [ ] `operating_authorizations`:
  - Primary: official regulatory/environmental approval records and resolutions.
  - Validation: resolution ID, authority, and effective date.
- [ ] `environmental_reports`:
  - Primary: official environmental reporting portals and approved EIA/DIA docs.
  - Validation: report type, period, and record URL.
- [ ] `geology_studies` / `mineral_life_studies`:
  - Primary: NI 43-101/JORC-style technical reports or equivalent technical disclosures.
  - Validation: publication date, reserve/resource section, and mine match.
- [ ] `mitigation_studies`:
  - Primary: approved environmental mitigation and monitoring plans.
  - Validation: project match + mitigation scope + current validity.
- [ ] `direct_workers` / `indirect_workers`:
  - Primary: official sustainability/annual reports with operation-level workforce.
  - Secondary: verified governmental labor disclosures when operation-specific.
  - Validation: year tag required.
- [ ] `average_salary`:
  - Primary: operation-level payroll disclosures where available.
  - Secondary: role-band salary disclosures in official reports/job frameworks.
  - Validation: currency + period required.
- [ ] `annual_revenue`:
  - Primary: operation-level revenue disclosures in audited/official reporting.
  - Secondary: segment-level reports if operation-specific value is explicit.
  - Validation: fiscal year + currency + source note.
- [ ] `operation_since`:
  - Primary: official company operation history and permits timeline.
  - Validation: date format and source publication date.
- [ ] `hiring_plan_2026`:
  - Primary: official hiring/expansion plans in company releases or approved project docs.
  - Validation: explicit 2026 scope required (no inference from generic growth text).

## Data Quality Policy (Strict)

- [ ] Reject inferred values for mandatory fields unless marked with explicit low confidence and queued for review.
- [ ] Require at least one valid source URL per mandatory field.
- [ ] Require freshness window (re-check sources every refresh cycle or configurable period).
- [ ] Keep immutable audit trail per field update (before/after, who/what process, timestamp).

## Public-Only Delivery Scope

- [x] Prioritize extraction for publicly feasible fields first (`mining_company`, `website`, `operation_since`, authorizations, environmental and technical studies).
- [x] Mark sensitive or non-public fields with explicit status (`not_public` / `not_disclosed`) instead of placeholders.
- [x] Track feasibility separately from achieved coverage in each refresh report.

## Phase 3 - Concessions Reliability

- [ ] Define business rule for `is_available_concession` (single source of truth).
- [ ] Add source strategy for concession status (official/manual fallback).
- [ ] Surface reliability badges in frontend.
- [ ] Report coverage metrics after each refresh:
  - `% with city`
  - `% with mining company`
  - `% with reliable concession status`

## Validation And Release

- [x] Run data validation script after changes.
  - 2026-04-28 local run OK via Dockerized PostgreSQL + `DATABASE_URL` (`Validation OK. Items: 3821. Warnings: 1054`).
- [x] Run focused UI checks for search and concession map behavior.
  - 2026-04-28 manual UI check OK on `http://localhost:8000` (search input filters results; `Solo concesiones disponibles` toggles active state and filtering).
- [x] Update README if data contract or fields change.
- [x] Prepare a short rollout note with risks and follow-ups.
