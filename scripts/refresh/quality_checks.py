from __future__ import annotations

import os

from .enrichment_pipeline import first_source_url, item_has_official_source
from .refresh_helpers import is_present
from storage import append_field_provenance, utc_now_iso


def evaluate_record_completeness(payload: dict) -> tuple[dict, dict[str, int]]:
    items = payload.get("items")
    if not isinstance(items, list):
        return payload, {"recordsCompleteCount": 0, "recordsIncompleteCount": 0}

    mandatory_scalar = (
        "mining_company",
        "direct_workers",
        "indirect_workers",
        "average_salary",
        "annual_revenue",
        "operation_since",
        "hiring_plan_2026",
        "website",
    )
    mandatory_list = (
        "operating_authorizations",
        "geology_studies",
        "mineral_life_studies",
        "mitigation_studies",
        "environmental_reports",
    )

    complete_count = 0
    incomplete_count = 0

    for item in items:
        if not isinstance(item, dict):
            continue
        gaps: list[str] = []
        provenance = item.get("field_provenance")
        provenance_rows = provenance if isinstance(provenance, list) else []

        def scalar_has_link_and_date(field_name: str) -> bool:
            if not is_present(item.get(field_name)):
                return False
            for row in provenance_rows:
                if not isinstance(row, dict):
                    continue
                if str(row.get("field_name") or "").strip() != field_name:
                    continue
                url = str(row.get("source_url") or "").strip()
                updated_at = str(row.get("updated_at") or "").strip()
                if url.startswith("http://") or url.startswith("https://"):
                    if updated_at:
                        return True
            return False

        for field in mandatory_scalar:
            if not scalar_has_link_and_date(field):
                gaps.append(field)

        enriched_at = str(item.get("enriched_at") or "").strip()
        for field in mandatory_list:
            rows = item.get(field)
            if not isinstance(rows, list) or len(rows) == 0:
                gaps.append(field)
                continue
            has_url = False
            for entry in rows:
                if isinstance(entry, str):
                    if entry.startswith("http://") or entry.startswith("https://"):
                        has_url = True
                        break
                elif isinstance(entry, dict):
                    url = str(entry.get("url") or "").strip()
                    if url.startswith("http://") or url.startswith("https://"):
                        has_url = True
                        break
            if not has_url or not enriched_at:
                gaps.append(field)

        if gaps:
            item["record_status"] = "incomplete"
            item["mandatory_gaps"] = sorted(set(gaps))
            incomplete_count += 1
        else:
            item["record_status"] = "complete"
            item["mandatory_gaps"] = []
            complete_count += 1

    return payload, {"recordsCompleteCount": complete_count, "recordsIncompleteCount": incomplete_count}


def keep_only_complete_records(payload: dict) -> tuple[dict, dict[str, int]]:
    items = payload.get("items")
    if not isinstance(items, list):
        return payload, {"recordsKeptCompleteOnly": 0, "recordsDroppedIncomplete": 0}

    kept: list[dict] = []
    dropped = 0
    for item in items:
        if not isinstance(item, dict):
            dropped += 1
            continue
        if str(item.get("record_status") or "").strip().lower() == "complete":
            kept.append(item)
        else:
            dropped += 1

    payload["items"] = kept
    return payload, {
        "recordsKeptCompleteOnly": len(kept),
        "recordsDroppedIncomplete": dropped,
    }


def keep_records_with_minimum_data(payload: dict) -> tuple[dict, dict[str, int]]:
    items = payload.get("items")
    if not isinstance(items, list):
        return payload, {"recordsKeptMinimumData": 0, "recordsDroppedMinimumData": 0}

    min_signals = int(os.getenv("KEEP_MIN_DATA_SIGNALS", "2"))
    if min_signals < 1:
        min_signals = 1

    kept: list[dict] = []
    dropped = 0
    for item in items:
        if not isinstance(item, dict):
            dropped += 1
            continue
        signal_count = 0
        for field_name in ("mining_company", "website", "operation_since"):
            if is_present(item.get(field_name)):
                signal_count += 1
        for list_field in (
            "operating_authorizations",
            "environmental_reports",
            "geology_studies",
            "mineral_life_studies",
            "mitigation_studies",
        ):
            rows = item.get(list_field)
            if isinstance(rows, list) and len(rows) > 0:
                signal_count += 1
        if signal_count >= min_signals:
            kept.append(item)
        else:
            dropped += 1

    payload["items"] = kept
    return payload, {"recordsKeptMinimumData": len(kept), "recordsDroppedMinimumData": dropped}


def _normalize_key_text(value: str) -> str:
    return " ".join("".join(ch.lower() if ch.isalnum() else " " for ch in (value or "")).split())


def dedupe_selected_records(payload: dict) -> tuple[dict, dict[str, int]]:
    items = payload.get("items")
    if not isinstance(items, list):
        return payload, {"recordsDedupKept": 0, "recordsDedupDropped": 0}

    best_by_key: dict[tuple[str, str], dict] = {}
    dropped = 0
    for item in items:
        if not isinstance(item, dict):
            dropped += 1
            continue
        key = (
            _normalize_key_text(str(item.get("name") or "")),
            _normalize_key_text(str(item.get("mining_company") or "")),
        )
        score = 0
        for field_name in ("website", "operation_since"):
            if is_present(item.get(field_name)):
                score += 1
        for list_field in (
            "operating_authorizations",
            "environmental_reports",
            "geology_studies",
            "mineral_life_studies",
            "mitigation_studies",
        ):
            rows = item.get(list_field)
            if isinstance(rows, list) and len(rows) > 0:
                score += 1
        current = best_by_key.get(key)
        if current is None:
            best_by_key[key] = item
            item["_selection_score"] = score
            continue
        current_score = int(current.get("_selection_score") or 0)
        if score > current_score:
            best_by_key[key] = item
            item["_selection_score"] = score
            dropped += 1
        else:
            dropped += 1

    kept_rows = list(best_by_key.values())
    for row in kept_rows:
        if isinstance(row, dict) and "_selection_score" in row:
            row.pop("_selection_score", None)
    payload["items"] = kept_rows
    return payload, {"recordsDedupKept": len(kept_rows), "recordsDedupDropped": dropped}


def seed_field_provenance(payload: dict) -> tuple[dict, int]:
    items = payload.get("items")
    if not isinstance(items, list):
        return payload, 0

    target_fields = (
        "mining_company",
        "website",
        "operation_since",
        "direct_workers",
        "indirect_workers",
        "average_salary",
        "annual_revenue",
        "hiring_plan_2026",
    )
    changed = 0
    now = utc_now_iso()
    for item in items:
        if not isinstance(item, dict):
            continue
        source_url = first_source_url(item)
        source_type = "official" if item_has_official_source(item) else "source"
        confidence = 0.75 if source_type == "official" else 0.65
        for field in target_fields:
            value = item.get(field)
            if not is_present(value):
                continue
            before = len(item.get("field_provenance") or []) if isinstance(item.get("field_provenance"), list) else 0
            append_field_provenance(
                item,
                field_name=field,
                field_value=str(value).strip(),
                source_type=source_type,
                source_url=source_url,
                confidence_score=confidence,
                note="seeded from dataset source",
                updated_at=now,
            )
            after = len(item.get("field_provenance") or []) if isinstance(item.get("field_provenance"), list) else 0
            if after > before:
                changed += 1
    return payload, changed


def compute_refresh_kpis(payload: dict, pending_curation: int) -> dict[str, int]:
    items = payload.get("items")
    if not isinstance(items, list) or not items:
        return {
            "kpiRecordsTotal": 0,
            "kpiRecordsWithAllMandatoryFields": 0,
            "kpiRecordsWithOfficialSource": 0,
            "kpiRecordsPendingManualCuration": max(0, int(pending_curation)),
            "kpiPctAllMandatoryFieldsBp": 0,
            "kpiPctOfficialSourceBp": 0,
            "kpiPctPendingManualCurationBp": 0,
        }

    mandatory_scalar_fields = (
        "mining_company",
        "direct_workers",
        "indirect_workers",
        "average_salary",
        "annual_revenue",
        "operation_since",
        "hiring_plan_2026",
        "website",
    )
    mandatory_list_fields = (
        "operating_authorizations",
        "geology_studies",
        "mineral_life_studies",
        "mitigation_studies",
        "environmental_reports",
    )

    total = len(items)
    all_mandatory_count = 0
    official_source_count = 0
    for item in items:
        if not isinstance(item, dict):
            continue
        has_scalars = all(is_present(item.get(field)) for field in mandatory_scalar_fields)
        has_lists = all(isinstance(item.get(field), list) and len(item.get(field) or []) > 0 for field in mandatory_list_fields)
        if has_scalars and has_lists:
            all_mandatory_count += 1
        if item_has_official_source(item):
            official_source_count += 1

    pending = max(0, min(int(pending_curation), total))

    def bp(count: int) -> int:
        return int(round((count / total) * 10000)) if total > 0 else 0

    return {
        "kpiRecordsTotal": total,
        "kpiRecordsWithAllMandatoryFields": all_mandatory_count,
        "kpiRecordsWithOfficialSource": official_source_count,
        "kpiRecordsPendingManualCuration": pending,
        "kpiPctAllMandatoryFieldsBp": bp(all_mandatory_count),
        "kpiPctOfficialSourceBp": bp(official_source_count),
        "kpiPctPendingManualCurationBp": bp(pending),
    }
