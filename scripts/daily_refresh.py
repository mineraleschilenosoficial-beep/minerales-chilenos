#!/usr/bin/env python3
"""Refresh dataset and persist it exclusively into PostgreSQL."""

from __future__ import annotations

import os
import time

from refresh.concession_logic import apply_concession_business_rule, enrich_concession_evidence_from_sernageomin
from refresh.enrichment_pipeline import (
    apply_bulk_fallback_enrichment,
    enrich_sprint3_fields_from_sources,
    enrich_sprint4_studies_from_docs,
    enrich_top_fields_from_sources,
)
from refresh.mrds_scraper import MRDS_WFS_URL, scrape_mrds_chile_dataset
from refresh.quality_checks import (
    compute_refresh_kpis,
    dedupe_selected_records,
    evaluate_record_completeness,
    keep_only_complete_records,
    keep_records_with_minimum_data,
    seed_field_provenance,
)
from refresh.refresh_runtime import (
    apply_production_alerts,
    enforce_rollback_policy,
    fetch_optional_remote_source,
    load_existing_dataset_safe,
)
from refresh.reverse_geocoding import enrich_city_commune_with_reverse_geocoding
from refresh.refresh_helpers import (
    env_enabled,
    merge_int_stats,
)
from storage import (
    apply_manual_overrides,
    keep_only_override_candidates,
    list_active_override_targets,
    rebuild_manual_curation_queue,
    save_dataset,
    utc_now_iso,
)

def scrape_dataset_with_fallback() -> tuple[dict, str]:
    try:
        dataset = scrape_mrds_chile_dataset()
        return dataset, "USGS MRDS WFS"
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"USGS MRDS WFS scraping failed ({MRDS_WFS_URL}): {exc}") from exc


def main() -> int:
    started_at = time.monotonic()

    def progress(message: str) -> None:
        elapsed = time.monotonic() - started_at
        print(f"[daily_refresh +{elapsed:6.1f}s] {message}", flush=True)

    source_url = os.getenv("DATA_JSON_SOURCE_URL", "").strip()
    source_mode = "rebuild"
    fast_local_mode = env_enabled("FAST_LOCAL_MODE")
    keep_complete_only = env_enabled("KEEP_ONLY_COMPLETE_RECORDS", "false")
    curated_only_mode = env_enabled("CURATED_ONLY_MODE", "true")
    keep_minimum_data = env_enabled("KEEP_ONLY_MINIMUM_DATA", "true")
    current: dict = {"meta": {}, "items": []}
    progress(f"start mode={'remote-json' if source_url else 'scrape-rebuild'} fast_local={fast_local_mode}")

    if source_url:
        try:
            remote = fetch_optional_remote_source(source_url)
            if remote:
                current["items"] = remote["items"]
                remote_meta = remote.get("meta", {})
                if isinstance(remote_meta, dict):
                    current["meta"].update(remote_meta)
                current["meta"]["updatedAt"] = utc_now_iso()
                source_mode = "remote-json"
                progress(f"remote source loaded items={len(current['items'])}")
        except Exception as exc:  # noqa: BLE001
            raise RuntimeError(f"Remote JSON refresh failed ({source_url}): {exc}") from exc
    else:
        progress("scraping source dataset")
        curated_targets = list_active_override_targets() if curated_only_mode else []
        if curated_only_mode:
            progress(f"curated scrape targets={len(curated_targets)}")
        scraped, source_name = (
            (scrape_mrds_chile_dataset(curated_targets), "USGS MRDS WFS (curated-targeted)")
            if curated_targets
            else scrape_dataset_with_fallback()
        )
        current = scraped
        current.setdefault("meta", {})
        current["meta"]["scrapeSourceName"] = source_name
        source_mode = "scrape-rebuild"
        progress(f"scraping complete items={len(current.get('items') or [])}")
    previous_snapshot = load_existing_dataset_safe()
    curated_candidates_kept = 0
    if curated_only_mode:
        original_count = len(current.get("items") or [])
        current, curated_candidates_kept = keep_only_override_candidates(current)
        progress(f"curated-only prefilter kept={curated_candidates_kept}/{original_count}")

    progress("enrich reverse geocoding")
    current, geocode_stats = enrich_city_commune_with_reverse_geocoding(current)
    progress(
        "reverse geocoding done "
        f"requested={geocode_stats.get('reverseGeocodeRequested', 0)} "
        f"applied={geocode_stats.get('reverseGeocodeApplied', 0)}"
    )
    progress("apply manual overrides")
    current, applied_overrides = apply_manual_overrides(current)
    progress(f"manual overrides done applied={applied_overrides}")
    progress("lookup concession evidence (SERNAGEOMIN)")
    current, concession_evidence_stats = enrich_concession_evidence_from_sernageomin(current)
    progress(
        "concession evidence done "
        f"queries={concession_evidence_stats.get('concessionEvidenceQueries', 0)} "
        f"matches={concession_evidence_stats.get('concessionEvidenceMatches', 0)} "
        f"writes={concession_evidence_stats.get('concessionEvidenceWrites', 0)}"
    )
    progress("enrich top fields")
    current, top_field_stats = enrich_top_fields_from_sources(current)
    progress("enrich sprint3/sprint4 fields")
    current, sprint3_stats = enrich_sprint3_fields_from_sources(current)
    current, sprint4_stats = enrich_sprint4_studies_from_docs(current)
    current, fallback_stats = apply_bulk_fallback_enrichment(current)
    progress("seed provenance + business/completeness checks")
    current, seeded_provenance = seed_field_provenance(current)
    current, concession_stats = apply_concession_business_rule(current)
    current, completeness_stats = evaluate_record_completeness(current)
    complete_only_stats = {"recordsKeptCompleteOnly": 0, "recordsDroppedIncomplete": 0}
    if keep_complete_only:
        current, complete_only_stats = keep_only_complete_records(current)
    minimum_data_stats = {"recordsKeptMinimumData": 0, "recordsDroppedMinimumData": 0}
    if keep_minimum_data:
        current, minimum_data_stats = keep_records_with_minimum_data(current)
    current, dedupe_stats = dedupe_selected_records(current)

    current["meta"].setdefault("version", 1)
    current["meta"].setdefault("source", "postgresql")
    current["meta"]["updatedAt"] = utc_now_iso()
    current["meta"]["lastVerifiedAt"] = utc_now_iso()
    current["meta"]["refreshMode"] = source_mode
    stats = current["meta"].get("scrapeStats")
    if not isinstance(stats, dict):
        stats = {}
        current["meta"]["scrapeStats"] = stats
    stats["manualOverridesApplied"] = int(applied_overrides)
    stats["fieldProvenanceSeeded"] = int(seeded_provenance)
    merge_int_stats(
        stats,
        geocode_stats,
        top_field_stats,
        sprint3_stats,
        sprint4_stats,
        fallback_stats,
        concession_evidence_stats,
        concession_stats,
        completeness_stats,
        complete_only_stats,
        minimum_data_stats,
        dedupe_stats,
    )
    stats["curatedCandidatesKept"] = int(curated_candidates_kept)

    pending_curation = int(rebuild_manual_curation_queue(current))
    stats["manualCurationPending"] = pending_curation
    for key, value in compute_refresh_kpis(current, pending_curation).items():
        stats[key] = int(value)
    apply_production_alerts(stats)
    if keep_complete_only or curated_only_mode or keep_minimum_data:
        stats["rollbackChecked"] = 0
    else:
        enforce_rollback_policy(previous_snapshot, current, stats)
    progress("save dataset")
    save_dataset(current)
    progress(f"complete mode={source_mode}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
