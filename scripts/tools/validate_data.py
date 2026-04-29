#!/usr/bin/env python3
"""Validate dataset from PostgreSQL with strict schema and freshness checks."""

from __future__ import annotations

import datetime as dt
import os
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.storage import get_dataset


def is_http_url(value: str) -> bool:
    try:
        parsed = urlparse(value)
        return parsed.scheme in {"http", "https"} and bool(parsed.netloc)
    except Exception:  # noqa: BLE001
        return False


def is_specific_url(value: str) -> bool:
    """Reject generic homepage-like URLs."""
    try:
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            return False
        path = (parsed.path or "").strip()
        # "/" or empty path is considered generic.
        if path in {"", "/"}:
            return False
        # If path is very short and no query/fragment, still likely generic.
        if len(path.strip("/")) < 3 and not parsed.query and not parsed.fragment:
            return False
        return True
    except Exception:  # noqa: BLE001
        return False


def parse_iso(value: str) -> dt.datetime | None:
    try:
        # Accept trailing Z
        value = value.replace("Z", "+00:00")
        return dt.datetime.fromisoformat(value)
    except Exception:  # noqa: BLE001
        return None


def is_recent_iso(value: str, max_age_days: int) -> bool:
    parsed = parse_iso(value)
    if parsed is None:
        return False
    now = dt.datetime.now(dt.timezone.utc)
    return (now - parsed) <= dt.timedelta(days=max_age_days)


def is_present_mandatory(value: Any) -> bool:
    normalized = str(value or "").strip().lower()
    if not normalized:
        return False
    if normalized in {"-", "#", "n/a", "na", "none", "null", "unknown"}:
        return False
    return True


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []

    try:
        payload = get_dataset()
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: cannot load dataset ({exc})")
        return 1
    meta = payload.get("meta")
    items = payload.get("items")

    if not isinstance(meta, dict):
        errors.append("meta must be an object")
    if not isinstance(items, list):
        errors.append("items must be an array")
        items = []

    if isinstance(meta, dict):
        for key in ("updatedAt", "version", "source"):
            if key not in meta:
                errors.append(f"meta.{key} is required")
        if "updatedAt" in meta:
            dt_value = parse_iso(str(meta["updatedAt"]))
            if dt_value is None:
                errors.append("meta.updatedAt must be ISO datetime")
            else:
                now = dt.datetime.now(dt.timezone.utc)
                age_days = (now - dt_value.astimezone(dt.timezone.utc)).days
                if age_days > 45:
                    warnings.append(f"meta.updatedAt seems old ({age_days} days)")

    seen_ids: set[int] = set()
    seen_names: set[str] = set()
    required_fields = (
        "id", "name", "minerals", "latitude", "longitude", "region", "site_type", "is_available_concession",
        "mining_company", "operation_since", "website", "data_origin", "confidence_score", "enriched_at"
    )
    mandatory_coverage_fields = (
        "mining_company",
        "direct_workers",
        "indirect_workers",
        "average_salary",
        "annual_revenue",
        "operation_since",
        "hiring_plan_2026",
        "operating_authorizations",
        "geology_studies",
        "mineral_life_studies",
        "mitigation_studies",
        "environmental_reports",
        "website",
    )
    mandatory_scalar_with_source = (
        "mining_company",
        "direct_workers",
        "indirect_workers",
        "average_salary",
        "annual_revenue",
        "operation_since",
        "hiring_plan_2026",
        "website",
    )
    mandatory_list_with_source = (
        "operating_authorizations",
        "geology_studies",
        "mineral_life_studies",
        "mitigation_studies",
        "environmental_reports",
    )
    covered_mandatory_records = 0

    for idx, item in enumerate(items):
        path = f"items[{idx}]"
        if not isinstance(item, dict):
            errors.append(f"{path} must be object")
            continue

        for field in required_fields:
            if field not in item:
                errors.append(f"{path}.{field} is required")

        item_id = item.get("id")
        if not isinstance(item_id, int):
            errors.append(f"{path}.id must be integer")
        elif item_id in seen_ids:
            errors.append(f"{path}.id duplicate value: {item_id}")
        else:
            seen_ids.add(item_id)

        name = item.get("name")
        if not isinstance(name, str) or not name.strip():
            errors.append(f"{path}.name must be non-empty string")
        elif name.lower() in seen_names:
            warnings.append(f"{path}.name duplicated by text: {name}")
        else:
            seen_names.add(name.lower())

        mineral = item.get("minerals")
        if not isinstance(mineral, list) or not mineral:
            errors.append(f"{path}.minerals must be non-empty array")
        elif not all(isinstance(x, str) and x.strip() for x in mineral):
            errors.append(f"{path}.minerals elements must be non-empty strings")

        lat = item.get("latitude")
        lng = item.get("longitude")
        if not isinstance(lat, (int, float)) or not (-90 <= float(lat) <= 90):
            errors.append(f"{path}.latitude must be number between -90 and 90")
        if not isinstance(lng, (int, float)) or not (-180 <= float(lng) <= 180):
            errors.append(f"{path}.longitude must be number between -180 and 180")

        if not isinstance(item.get("region"), str) or not item["region"].strip():
            errors.append(f"{path}.region must be non-empty string")
        if not isinstance(item.get("site_type"), str) or not item["site_type"].strip():
            errors.append(f"{path}.site_type must be non-empty string")
        if not isinstance(item.get("is_available_concession"), bool):
            errors.append(f"{path}.is_available_concession must be boolean")
        if not isinstance(item.get("mining_company"), str):
            errors.append(f"{path}.mining_company must be string")
        if not isinstance(item.get("operation_since"), str):
            errors.append(f"{path}.operation_since must be string")
        if not isinstance(item.get("data_origin"), str) or not item["data_origin"].strip():
            errors.append(f"{path}.data_origin must be non-empty string")
        confidence_score = item.get("confidence_score")
        if not isinstance(confidence_score, (int, float)) or not (0 <= float(confidence_score) <= 1):
            errors.append(f"{path}.confidence_score must be number between 0 and 1")
        record_status = item.get("record_status")
        mandatory_gaps = item.get("mandatory_gaps")
        if record_status is not None:
            if not isinstance(record_status, str) or record_status not in {"complete", "incomplete"}:
                errors.append(f"{path}.record_status must be 'complete' or 'incomplete' when present")
            if mandatory_gaps is not None and not isinstance(mandatory_gaps, list):
                errors.append(f"{path}.mandatory_gaps must be array when present")
            if (
                isinstance(record_status, str)
                and record_status == "complete"
                and isinstance(mandatory_gaps, list)
                and len(mandatory_gaps) > 0
            ):
                errors.append(f"{path}.record_status=complete but mandatory_gaps is not empty")
        enriched_at = item.get("enriched_at")
        if not isinstance(enriched_at, str) or not enriched_at.strip():
            errors.append(f"{path}.enriched_at must be non-empty string")
        elif parse_iso(enriched_at) is None:
            errors.append(f"{path}.enriched_at must be ISO datetime")
        for optional_text in ("average_salary", "annual_revenue", "hiring_plan_2026", "direct_workers", "indirect_workers"):
            value = item.get(optional_text)
            if value is not None and not isinstance(value, str):
                errors.append(f"{path}.{optional_text} must be string when present")

        web = item.get("website")
        if web is not None and web != "#":
            if not isinstance(web, str) or not is_http_url(web):
                errors.append(f"{path}.website must be http/https URL or '#'")

        for list_field in ("environmental_reports", "operating_authorizations", "geology_studies", "mineral_life_studies", "mitigation_studies"):
            value = item.get(list_field)
            if value is not None and not isinstance(value, list):
                errors.append(f"{path}.{list_field} must be array when present")

        provenance_rows = item.get("field_provenance")
        if provenance_rows is not None and not isinstance(provenance_rows, list):
            errors.append(f"{path}.field_provenance must be array when present")
            provenance_rows = []
        if provenance_rows is None:
            provenance_rows = []

        def has_source_for_field(field_name: str) -> bool:
            for row in provenance_rows:
                if not isinstance(row, dict):
                    continue
                if str(row.get("field_name") or "").strip() != field_name:
                    continue
                url = str(row.get("source_url") or "").strip()
                if is_http_url(url):
                    return True
            return False

        for field in mandatory_scalar_with_source:
            if is_present_mandatory(item.get(field)) and not has_source_for_field(field):
                errors.append(f"{path}.{field} requires at least one field_provenance source_url")

        for field in mandatory_list_with_source:
            rows = item.get(field)
            if not isinstance(rows, list) or not rows:
                continue
            has_any_url = False
            for entry in rows:
                if isinstance(entry, str) and is_http_url(entry):
                    has_any_url = True
                    break
                if isinstance(entry, dict) and is_http_url(str(entry.get("url") or "")):
                    has_any_url = True
                    break
            if not has_any_url:
                errors.append(f"{path}.{field} requires at least one valid source URL")
        if all(
            (
                isinstance(item.get(field), list) and len(item.get(field) or []) > 0
            )
            if field in {"operating_authorizations", "geology_studies", "mineral_life_studies", "mitigation_studies", "environmental_reports"}
            else is_present_mandatory(item.get(field))
            for field in mandatory_coverage_fields
        ):
            covered_mandatory_records += 1

        docs = item.get("docs")
        if docs is not None:
            if not isinstance(docs, list):
                errors.append(f"{path}.docs must be array")
            else:
                for d_idx, doc in enumerate(docs):
                    dpath = f"{path}.docs[{d_idx}]"
                    if not isinstance(doc, dict):
                        errors.append(f"{dpath} must be object")
                        continue
                    if not isinstance(doc.get("name"), str) or not doc["name"].strip():
                        errors.append(f"{dpath}.name must be non-empty string")
                    url = doc.get("url")
                    if not isinstance(url, str) or not is_http_url(url):
                        errors.append(f"{dpath}.url must be valid http/https URL")
                    elif not is_specific_url(url):
                        errors.append(f"{dpath}.url must be specific (not homepage/root)")
                    doc_type = doc.get("doc_type")
                    if doc_type is not None and (not isinstance(doc_type, str) or not doc_type.strip()):
                        errors.append(f"{dpath}.doc_type must be non-empty string when present")

        sources = item.get("sources")
        if sources is not None:
            if not isinstance(sources, list) or not sources:
                errors.append(f"{path}.sources must be a non-empty array when present")
            else:
                for s_idx, src in enumerate(sources):
                    spath = f"{path}.sources[{s_idx}]"
                    if not isinstance(src, dict):
                        errors.append(f"{spath} must be object")
                        continue
                    name = src.get("name")
                    url = src.get("url")
                    note = src.get("note")
                    if not isinstance(name, str) or not name.strip():
                        errors.append(f"{spath}.name must be non-empty string")
                    if not isinstance(url, str) or not is_http_url(url):
                        errors.append(f"{spath}.url must be valid http/https URL")
                    elif not is_specific_url(url):
                        errors.append(f"{spath}.url must be specific (not homepage/root)")
                    if note is not None and (not isinstance(note, str) or not note.strip()):
                        errors.append(f"{spath}.note must be non-empty string when present")

    coverage_ratio = (covered_mandatory_records / len(items)) if items else 0.0
    warnings.append(
        "coverage.mandatory_fields_complete="
        f"{covered_mandatory_records}/{len(items)} ({coverage_ratio * 100:.2f}%)"
    )
    threshold_raw = os.getenv("MANDATORY_FIELD_COVERAGE_MIN", "0.0").strip()
    try:
        coverage_threshold = float(threshold_raw)
    except ValueError:
        coverage_threshold = 0.0
        warnings.append(f"MANDATORY_FIELD_COVERAGE_MIN invalid value '{threshold_raw}', using 0.0")
    if coverage_threshold < 0:
        coverage_threshold = 0.0
    if coverage_threshold > 1:
        coverage_threshold = 1.0
    if coverage_ratio < coverage_threshold:
        errors.append(
            "mandatory field coverage gate failed: "
            f"{coverage_ratio * 100:.2f}% < {coverage_threshold * 100:.2f}% "
            f"(set by MANDATORY_FIELD_COVERAGE_MIN)"
        )

    freshness_days_raw = os.getenv("SOURCE_FRESHNESS_MAX_DAYS", "7").strip()
    try:
        freshness_days = max(1, int(freshness_days_raw))
    except ValueError:
        freshness_days = 7
        warnings.append(f"SOURCE_FRESHNESS_MAX_DAYS invalid value '{freshness_days_raw}', using 7")

    for idx, item in enumerate(items):
        path = f"items[{idx}]"
        catalog = item.get("source_catalog")
        if catalog is None:
            continue
        if not isinstance(catalog, list):
            errors.append(f"{path}.source_catalog must be array when present")
            continue
        for sidx, row in enumerate(catalog):
            spath = f"{path}.source_catalog[{sidx}]"
            if not isinstance(row, dict):
                errors.append(f"{spath} must be object")
                continue
            last_checked = str(row.get("last_checked_at") or "").strip()
            if not last_checked:
                errors.append(f"{spath}.last_checked_at is required")
                continue
            if not is_recent_iso(last_checked, freshness_days):
                errors.append(
                    f"{spath}.last_checked_at is stale (> {freshness_days} days) under SOURCE_FRESHNESS_MAX_DAYS"
                )

    if isinstance(meta, dict):
        sources = meta.get("sources")
        if sources is not None:
            if not isinstance(sources, list) or not sources:
                errors.append("meta.sources must be a non-empty array when present")
            else:
                for s_idx, src in enumerate(sources):
                    spath = f"meta.sources[{s_idx}]"
                    if not isinstance(src, dict):
                        errors.append(f"{spath} must be object")
                        continue
                    name = src.get("name")
                    url = src.get("url")
                    note = src.get("note")
                    if not isinstance(name, str) or not name.strip():
                        errors.append(f"{spath}.name must be non-empty string")
                    if not isinstance(url, str) or not is_http_url(url):
                        errors.append(f"{spath}.url must be valid http/https URL")
                    elif not is_specific_url(url):
                        errors.append(f"{spath}.url must be specific (not homepage/root)")
                    if note is not None and (not isinstance(note, str) or not note.strip()):
                        errors.append(f"{spath}.note must be non-empty string when present")

    if warnings:
        print("Warnings:")
        for warning in warnings:
            print(f"- {warning}")

    if errors:
        print("Errors:")
        for err in errors:
            print(f"- {err}")
        print(f"\nValidation failed with {len(errors)} error(s).")
        return 1

    print(f"Validation OK. Items: {len(items)}. Warnings: {len(warnings)}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
