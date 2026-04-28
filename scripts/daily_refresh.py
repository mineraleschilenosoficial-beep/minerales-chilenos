#!/usr/bin/env python3
"""Refresh dataset and persist it exclusively into PostgreSQL."""

from __future__ import annotations

import json
import os
import re
import ssl
import time
import urllib.request
import xml.etree.ElementTree as ET
from urllib.parse import urlencode, urlparse

from storage import (
    apply_manual_overrides,
    append_field_provenance,
    get_dataset,
    get_reverse_geocode_cache,
    rebuild_manual_curation_queue,
    save_dataset,
    upsert_reverse_geocode_cache,
    utc_now_iso,
)


MRDS_WFS_URL = "https://mrdata.usgs.gov/services/mrds"
MRDS_MAX_FEATURES_PER_QUERY = 2000
MRDS_LAYERS = ("mrds-high", "mrds-low")
MRDS_QUERY_BBOXES = (
    (-72.0, -24.0, -68.0, -18.0),  # Norte
    (-71.5, -28.5, -67.0, -24.0),  # Norte-centro
    (-71.5, -32.5, -67.0, -28.5),  # Centro
    (-76.5, -32.5, -71.5, -28.5),  # Centro costa
    (-76.5, -43.5, -66.0, -32.5),  # Centro-sur
    (-76.5, -56.5, -66.0, -43.5),  # Sur
)
NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"
DEFAULT_REVERSE_GEOCODE_MAX_LOOKUPS = 40
DEFAULT_REVERSE_GEOCODE_DELAY_SECONDS = 1.0
EXCLUDED_WEBSITE_HOSTS = {
    "mrdata.usgs.gov",
    "www.mrdata.usgs.gov",
    "nominatim.openstreetmap.org",
}
AUTHORIZATION_KEYWORDS = ("autoriz", "authoriz", "permit", "licenc", "resolucion", "resolution", "rca")
ENVIRONMENTAL_KEYWORDS = ("ambient", "environ", "eia", "dia", "impacto")
COMPANY_HINT_KEYWORDS = ("minera", "mining", "corp", "company", "compania", "compañia", "ltd", "s.a")
GEOLOGY_KEYWORDS = ("geolog", "jorc", "43-101", "resource", "reserv")
MINERAL_LIFE_KEYWORDS = ("life of mine", "vida util", "life", "reserve life", "remaining years")
MITIGATION_KEYWORDS = ("mitig", "compens", "monitor", "remedi", "rehabilit")


def _is_present(value) -> bool:
    normalized = str(value or "").strip().lower()
    return bool(normalized) and normalized not in {"-", "#", "n/a", "na", "none", "null", "unknown"}


def _item_has_official_source(item: dict) -> bool:
    sources = item.get("sources")
    if not isinstance(sources, list):
        return False
    official_tokens = ("usgs", ".gov", ".gob.", "ministerio", "sernageomin")
    for source in sources:
        if not isinstance(source, dict):
            continue
        name = str(source.get("name") or "").lower()
        url = str(source.get("url") or "").lower()
        haystack = f"{name} {url}"
        if any(token in haystack for token in official_tokens):
            return True
    return False


def _normalize_doc_entry(entry) -> dict[str, str] | None:
    if isinstance(entry, str):
        url = entry.strip()
        if not url:
            return None
        return {"name": url, "url": url, "note": "", "doc_type": ""}
    if not isinstance(entry, dict):
        return None
    url = str(entry.get("url") or "").strip()
    if not url:
        return None
    return {
        "name": str(entry.get("name") or url).strip(),
        "url": url,
        "note": str(entry.get("note") or "").strip(),
        "doc_type": str(entry.get("doc_type") or "").strip(),
    }


def _looks_like_valid_external_website(url: str) -> bool:
    try:
        parsed = urlparse(url)
    except Exception:  # noqa: BLE001
        return False
    if parsed.scheme not in {"http", "https"}:
        return False
    host = (parsed.netloc or "").strip().lower()
    if not host or host in EXCLUDED_WEBSITE_HOSTS:
        return False
    return True


def _looks_like_company_name(value: str) -> bool:
    normalized = str(value or "").strip().lower()
    if not normalized or len(normalized) < 4:
        return False
    return any(token in normalized for token in COMPANY_HINT_KEYWORDS)


def enrich_top_fields_from_sources(payload: dict) -> tuple[dict, dict[str, int]]:
    items = payload.get("items")
    if not isinstance(items, list):
        return payload, {
            "topFieldWebsiteExtracted": 0,
            "topFieldCompanyExtracted": 0,
            "topFieldAuthorizationsExtracted": 0,
            "topFieldEnvironmentalReportsExtracted": 0,
        }

    stats = {
        "topFieldWebsiteExtracted": 0,
        "topFieldCompanyExtracted": 0,
        "topFieldAuthorizationsExtracted": 0,
        "topFieldEnvironmentalReportsExtracted": 0,
    }
    now = utc_now_iso()
    for item in items:
        if not isinstance(item, dict):
            continue

        source_rows = [_normalize_doc_entry(x) for x in (item.get("sources") or [])]
        source_rows = [x for x in source_rows if x]
        doc_rows = [_normalize_doc_entry(x) for x in (item.get("docs") or [])]
        doc_rows = [x for x in doc_rows if x]

        # 1) Website extraction from trustworthy external sources.
        current_website = str(item.get("website") or "").strip()
        if not _is_present(current_website):
            for src in source_rows + doc_rows:
                url = src["url"]
                if not _looks_like_valid_external_website(url):
                    continue
                item["website"] = url
                append_field_provenance(
                    item,
                    field_name="website",
                    field_value=url,
                    source_type="official" if _item_has_official_source(item) else "source",
                    source_url=url,
                    confidence_score=0.65,
                    note="auto extracted from source catalog",
                    updated_at=now,
                )
                stats["topFieldWebsiteExtracted"] += 1
                break

        # 2) Company extraction from source names with company hints.
        current_company = str(item.get("mining_company") or "").strip()
        if not _is_present(current_company):
            for src in source_rows:
                candidate = src["name"]
                if not _looks_like_company_name(candidate):
                    continue
                item["mining_company"] = candidate
                append_field_provenance(
                    item,
                    field_name="mining_company",
                    field_value=candidate,
                    source_type="source",
                    source_url=src["url"],
                    confidence_score=0.6,
                    note="auto extracted from source name",
                    updated_at=now,
                )
                stats["topFieldCompanyExtracted"] += 1
                break

        # 3) Authorizations and environmental reports extraction from docs.
        existing_auth = item.get("operating_authorizations")
        if not isinstance(existing_auth, list):
            existing_auth = []
            item["operating_authorizations"] = existing_auth
        existing_env = item.get("environmental_reports")
        if not isinstance(existing_env, list):
            existing_env = []
            item["environmental_reports"] = existing_env

        auth_urls = {
            str((row.get("url") if isinstance(row, dict) else row) or "").strip()
            for row in existing_auth
            if isinstance(row, (dict, str))
        }
        env_urls = {
            str((row.get("url") if isinstance(row, dict) else row) or "").strip()
            for row in existing_env
            if isinstance(row, (dict, str))
        }

        for doc in doc_rows:
            searchable = " ".join((doc["name"], doc["note"], doc["doc_type"], doc["url"])).lower()
            if any(token in searchable for token in AUTHORIZATION_KEYWORDS):
                if doc["url"] and doc["url"] not in auth_urls:
                    existing_auth.append(doc)
                    auth_urls.add(doc["url"])
                    stats["topFieldAuthorizationsExtracted"] += 1
            if any(token in searchable for token in ENVIRONMENTAL_KEYWORDS):
                if doc["url"] and doc["url"] not in env_urls:
                    existing_env.append(doc)
                    env_urls.add(doc["url"])
                    stats["topFieldEnvironmentalReportsExtracted"] += 1

    return payload, stats


def _extract_first_year(text: str) -> str | None:
    match = re.search(r"\b(19\d{2}|20\d{2})\b", text)
    return match.group(1) if match else None


def _extract_number_from_keyword(text: str, keyword: str) -> str | None:
    pattern = rf"{keyword}\D{{0,24}}(\d{{1,7}})"
    match = re.search(pattern, text, flags=re.IGNORECASE)
    return match.group(1) if match else None


def _extract_salary(text: str) -> str | None:
    # Examples: CLP 1200000 / USD 2500 / $ 800000
    match = re.search(r"\b(CLP|USD)\s*([\d\.\,]{3,})\b", text, flags=re.IGNORECASE)
    if match:
        return f"{match.group(1).upper()} {match.group(2)}"
    match = re.search(r"\$\s*([\d\.\,]{3,})\b", text)
    if match:
        return f"CLP {match.group(1)}"
    return None


def _extract_revenue(text: str) -> str | None:
    # Examples: revenue USD 120M / ingresos CLP 5000000000
    match = re.search(r"\b(revenue|ingresos?)\b.{0,20}\b(CLP|USD)\s*([\d\.\,]+(?:m|mm|bn)?)", text, flags=re.IGNORECASE)
    if not match:
        return None
    return f"{match.group(2).upper()} {match.group(3)}"


def _extract_hiring_2026(text: str) -> str | None:
    if "2026" not in text:
        return None
    match = re.search(r"\b(?:hiring|contrataci[oó]n|contrataciones?)\b.{0,24}(\d{1,6})", text, flags=re.IGNORECASE)
    if not match:
        return None
    return f"{match.group(1)} planned hires (2026)"


def enrich_sprint3_fields_from_sources(payload: dict) -> tuple[dict, dict[str, int]]:
    items = payload.get("items")
    if not isinstance(items, list):
        return payload, {
            "sprint3DirectWorkersExtracted": 0,
            "sprint3IndirectWorkersExtracted": 0,
            "sprint3AverageSalaryExtracted": 0,
            "sprint3AnnualRevenueExtracted": 0,
            "sprint3OperationSinceExtracted": 0,
            "sprint3HiringPlan2026Extracted": 0,
        }

    stats = {
        "sprint3DirectWorkersExtracted": 0,
        "sprint3IndirectWorkersExtracted": 0,
        "sprint3AverageSalaryExtracted": 0,
        "sprint3AnnualRevenueExtracted": 0,
        "sprint3OperationSinceExtracted": 0,
        "sprint3HiringPlan2026Extracted": 0,
    }
    now = utc_now_iso()

    for item in items:
        if not isinstance(item, dict):
            continue
        rows = [_normalize_doc_entry(x) for x in (item.get("sources") or [])]
        rows += [_normalize_doc_entry(x) for x in (item.get("docs") or [])]
        rows = [x for x in rows if x]
        if not rows:
            continue

        for row in rows:
            source_url = row["url"]
            text_blob = " ".join((row["name"], row["note"], row["doc_type"], source_url))
            lower_blob = text_blob.lower()

            if not _is_present(item.get("direct_workers")):
                direct = _extract_number_from_keyword(lower_blob, r"(direct|directos?)")
                if direct:
                    item["direct_workers"] = direct
                    append_field_provenance(
                        item,
                        field_name="direct_workers",
                        field_value=direct,
                        source_type="inferred",
                        source_url=source_url,
                        confidence_score=0.45,
                        note="sprint3 keyword extraction",
                        updated_at=now,
                    )
                    stats["sprint3DirectWorkersExtracted"] += 1

            if not _is_present(item.get("indirect_workers")):
                indirect = _extract_number_from_keyword(lower_blob, r"(indirect|indirectos?)")
                if indirect:
                    item["indirect_workers"] = indirect
                    append_field_provenance(
                        item,
                        field_name="indirect_workers",
                        field_value=indirect,
                        source_type="inferred",
                        source_url=source_url,
                        confidence_score=0.45,
                        note="sprint3 keyword extraction",
                        updated_at=now,
                    )
                    stats["sprint3IndirectWorkersExtracted"] += 1

            if not _is_present(item.get("average_salary")):
                salary = _extract_salary(text_blob)
                if salary:
                    item["average_salary"] = salary
                    append_field_provenance(
                        item,
                        field_name="average_salary",
                        field_value=salary,
                        source_type="inferred",
                        source_url=source_url,
                        confidence_score=0.4,
                        note="sprint3 salary extraction",
                        updated_at=now,
                    )
                    stats["sprint3AverageSalaryExtracted"] += 1

            if not _is_present(item.get("annual_revenue")):
                revenue = _extract_revenue(text_blob)
                if revenue:
                    item["annual_revenue"] = revenue
                    append_field_provenance(
                        item,
                        field_name="annual_revenue",
                        field_value=revenue,
                        source_type="inferred",
                        source_url=source_url,
                        confidence_score=0.4,
                        note="sprint3 revenue extraction",
                        updated_at=now,
                    )
                    stats["sprint3AnnualRevenueExtracted"] += 1

            if not _is_present(item.get("operation_since")):
                year = _extract_first_year(text_blob)
                if year:
                    item["operation_since"] = year
                    append_field_provenance(
                        item,
                        field_name="operation_since",
                        field_value=year,
                        source_type="inferred",
                        source_url=source_url,
                        confidence_score=0.42,
                        note="sprint3 year extraction",
                        updated_at=now,
                    )
                    stats["sprint3OperationSinceExtracted"] += 1

            if not _is_present(item.get("hiring_plan_2026")):
                hiring = _extract_hiring_2026(lower_blob)
                if hiring:
                    item["hiring_plan_2026"] = hiring
                    append_field_provenance(
                        item,
                        field_name="hiring_plan_2026",
                        field_value=hiring,
                        source_type="inferred",
                        source_url=source_url,
                        confidence_score=0.4,
                        note="sprint3 hiring extraction",
                        updated_at=now,
                    )
                    stats["sprint3HiringPlan2026Extracted"] += 1

    return payload, stats


def enrich_sprint4_studies_from_docs(payload: dict) -> tuple[dict, dict[str, int]]:
    items = payload.get("items")
    if not isinstance(items, list):
        return payload, {
            "sprint4GeologyStudiesExtracted": 0,
            "sprint4MineralLifeStudiesExtracted": 0,
            "sprint4MitigationStudiesExtracted": 0,
        }

    stats = {
        "sprint4GeologyStudiesExtracted": 0,
        "sprint4MineralLifeStudiesExtracted": 0,
        "sprint4MitigationStudiesExtracted": 0,
    }
    for item in items:
        if not isinstance(item, dict):
            continue
        doc_rows = [_normalize_doc_entry(x) for x in (item.get("docs") or [])]
        doc_rows = [x for x in doc_rows if x]
        if not doc_rows:
            continue

        geology = item.get("geology_studies")
        if not isinstance(geology, list):
            geology = []
            item["geology_studies"] = geology
        mineral_life = item.get("mineral_life_studies")
        if not isinstance(mineral_life, list):
            mineral_life = []
            item["mineral_life_studies"] = mineral_life
        mitigation = item.get("mitigation_studies")
        if not isinstance(mitigation, list):
            mitigation = []
            item["mitigation_studies"] = mitigation

        geology_urls = {str((x.get("url") if isinstance(x, dict) else x) or "").strip() for x in geology if isinstance(x, (dict, str))}
        mineral_life_urls = {
            str((x.get("url") if isinstance(x, dict) else x) or "").strip()
            for x in mineral_life
            if isinstance(x, (dict, str))
        }
        mitigation_urls = {str((x.get("url") if isinstance(x, dict) else x) or "").strip() for x in mitigation if isinstance(x, (dict, str))}

        for doc in doc_rows:
            searchable = " ".join((doc["name"], doc["note"], doc["doc_type"], doc["url"])).lower()
            url = doc["url"]
            if any(token in searchable for token in GEOLOGY_KEYWORDS):
                if url and url not in geology_urls:
                    geology.append(doc)
                    geology_urls.add(url)
                    stats["sprint4GeologyStudiesExtracted"] += 1
            if any(token in searchable for token in MINERAL_LIFE_KEYWORDS):
                if url and url not in mineral_life_urls:
                    mineral_life.append(doc)
                    mineral_life_urls.add(url)
                    stats["sprint4MineralLifeStudiesExtracted"] += 1
            if any(token in searchable for token in MITIGATION_KEYWORDS):
                if url and url not in mitigation_urls:
                    mitigation.append(doc)
                    mitigation_urls.add(url)
                    stats["sprint4MitigationStudiesExtracted"] += 1

    return payload, stats


def _first_source_url(item: dict) -> str:
    sources = item.get("sources")
    if not isinstance(sources, list):
        return ""
    for source in sources:
        if not isinstance(source, dict):
            continue
        url = str(source.get("url") or "").strip()
        if url:
            return url
    return ""


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
            if not _is_present(item.get(field_name)):
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
        source_url = _first_source_url(item)
        source_type = "official" if _item_has_official_source(item) else "source"
        confidence = 0.75 if source_type == "official" else 0.65
        for field in target_fields:
            value = item.get(field)
            if not _is_present(value):
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
        has_scalars = all(_is_present(item.get(field)) for field in mandatory_scalar_fields)
        has_lists = all(isinstance(item.get(field), list) and len(item.get(field) or []) > 0 for field in mandatory_list_fields)
        if has_scalars and has_lists:
            all_mandatory_count += 1
        if _item_has_official_source(item):
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


def load_existing_dataset_safe() -> dict | None:
    try:
        return get_dataset()
    except Exception:  # noqa: BLE001
        return None


def apply_production_alerts(stats: dict[str, int]) -> int:
    alerts = 0
    mandatory_min_bp = int(os.getenv("ALERT_MANDATORY_COVERAGE_MIN_BP", "2000"))
    official_min_bp = int(os.getenv("ALERT_OFFICIAL_SOURCE_MIN_BP", "5000"))
    reliable_concession_min_bp = int(os.getenv("ALERT_RELIABLE_CONCESSION_MIN_BP", "2000"))
    if int(stats.get("kpiPctAllMandatoryFieldsBp", 0)) < mandatory_min_bp:
        alerts += 1
    if int(stats.get("kpiPctOfficialSourceBp", 0)) < official_min_bp:
        alerts += 1
    if int(stats.get("coverageReliableConcessionBp", 0)) < reliable_concession_min_bp:
        alerts += 1
    stats["alertsTriggered"] = alerts
    return alerts


def enforce_rollback_policy(previous: dict | None, current: dict, stats: dict[str, int]) -> None:
    if not previous:
        stats["rollbackChecked"] = 0
        return

    prev_items = previous.get("items")
    cur_items = current.get("items")
    if not isinstance(prev_items, list) or not isinstance(cur_items, list) or not prev_items:
        stats["rollbackChecked"] = 0
        return

    prev_count = len(prev_items)
    cur_count = len(cur_items)
    drop_ratio = max(0.0, (prev_count - cur_count) / prev_count)
    stats["rollbackChecked"] = 1
    stats["rollbackPrevCount"] = prev_count
    stats["rollbackCurrentCount"] = cur_count
    stats["rollbackDropRatioBp"] = int(round(drop_ratio * 10000))

    max_drop_ratio = float(os.getenv("ROLLBACK_MAX_ITEM_DROP_RATIO", "0.40"))
    if drop_ratio > max_drop_ratio:
        raise RuntimeError(
            "Rollback policy triggered: new dataset item count dropped too much "
            f"({cur_count}/{prev_count}, drop={drop_ratio:.2%}, limit={max_drop_ratio:.2%})."
        )


def apply_concession_business_rule(payload: dict) -> tuple[dict, dict[str, int]]:
    items = payload.get("items")
    if not isinstance(items, list):
        return payload, {
            "concessionReliableCount": 0,
            "concessionTrueCount": 0,
            "coverageCityCount": 0,
            "coverageMiningCompanyCount": 0,
            "coverageReliableConcessionCount": 0,
            "coverageCityBp": 0,
            "coverageMiningCompanyBp": 0,
            "coverageReliableConcessionBp": 0,
        }

    reliable_count = 0
    true_count = 0
    city_count = 0
    mining_company_count = 0
    now = utc_now_iso()
    total = len(items)
    for item in items:
        if not isinstance(item, dict):
            continue
        if _is_present(item.get("city")):
            city_count += 1
        if _is_present(item.get("mining_company")):
            mining_company_count += 1

        reliable = False
        # 1) Manual/official field provenance for concession has highest precedence.
        provenance = item.get("field_provenance")
        if isinstance(provenance, list):
            for row in provenance:
                if not isinstance(row, dict):
                    continue
                if str(row.get("field_name") or "").strip() != "is_available_concession":
                    continue
                source_type = str(row.get("source_type") or "").strip().lower()
                if source_type in {"manual", "official"}:
                    reliable = True
                    break

        # 2) Official operating authorizations imply available concession.
        authorizations = item.get("operating_authorizations")
        has_authorizations = isinstance(authorizations, list) and len(authorizations) > 0
        if has_authorizations:
            item["is_available_concession"] = True
            true_count += 1
            reliable = True
            source_url = ""
            first_auth = authorizations[0]
            if isinstance(first_auth, dict):
                source_url = str(first_auth.get("url") or "").strip()
            elif isinstance(first_auth, str):
                source_url = first_auth.strip()
            append_field_provenance(
                item,
                field_name="is_available_concession",
                field_value="true",
                source_type="official",
                source_url=source_url,
                confidence_score=0.85,
                note="derived from operating_authorizations presence",
                updated_at=now,
            )
        else:
            # 3) Default false when there is no evidence for active concession.
            current = bool(item.get("is_available_concession"))
            if current:
                true_count += 1
            else:
                item["is_available_concession"] = False

        if reliable:
            reliable_count += 1

    def bp(count: int) -> int:
        return int(round((count / total) * 10000)) if total > 0 else 0

    return payload, {
        "concessionReliableCount": reliable_count,
        "concessionTrueCount": true_count,
        "coverageCityCount": city_count,
        "coverageMiningCompanyCount": mining_company_count,
        "coverageReliableConcessionCount": reliable_count,
        "coverageCityBp": bp(city_count),
        "coverageMiningCompanyBp": bp(mining_company_count),
        "coverageReliableConcessionBp": bp(reliable_count),
    }


def fetch_optional_remote_source(url: str) -> dict | None:
    ctx = ssl.create_default_context()
    request = urllib.request.Request(
        url,
        method="GET",
        headers={"User-Agent": "Mozilla/5.0 (DailyRefresh)"},
    )
    with urllib.request.urlopen(request, timeout=30, context=ctx) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if not isinstance(payload, dict) or not isinstance(payload.get("items"), list):
        raise ValueError("Remote payload must be an object with 'items' array.")
    return payload


def _request_text(url: str, params: dict[str, str]) -> str:
    query = urlencode(params)
    request = urllib.request.Request(
        f"{url}?{query}",
        method="GET",
        headers={"User-Agent": "Mozilla/5.0 (DailyRefresh)"},
    )
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(request, timeout=45, context=ctx) as response:
        return response.read().decode("utf-8", "ignore")


def _to_float(value) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.replace(",", "."))
        except ValueError:
            return None
    return None


def _parse_mrds_coordinates(raw_value: str) -> tuple[float | None, float | None]:
    if not raw_value:
        return None, None
    first = raw_value.split()[0]
    if "," not in first:
        return None, None
    lon_raw, lat_raw = first.split(",", 1)
    lat = _to_float(lat_raw)
    lng = _to_float(lon_raw)
    return lat, lng


def _decode_mrds_minerals(code_list: str) -> list[str]:
    code_map = {
        "CU": "cobre",
        "AU": "oro",
        "AG": "plata",
        "FE": "hierro",
        "LI": "litio",
        "MO": "molibdeno",
        "ZN": "zinc",
        "PB": "plomo",
        "MN": "manganeso",
    }
    minerals: list[str] = []
    for token in code_list.replace(",", " ").split():
        clean = token.strip().upper()
        if not clean:
            continue
        minerals.append(code_map.get(clean, clean.lower()))
    unique = sorted({m for m in minerals if m})
    return unique or ["desconocido"]


def _translate_dev_status(value: str) -> str:
    normalized = _normalize_name(value)
    status_map = {
        "producer": "Productor",
        "past producer": "Ex productor",
        "prospect": "Prospecto",
        "occurrence": "Ocurrencia mineral",
        "unknown": "Sin clasificar",
        "deposit": "Yacimiento",
        "mine": "Mina",
        "plant": "Planta",
        "refinery": "Refineria",
    }
    return status_map.get(normalized, value.strip() or "Yacimiento")


def _normalize_name(value: str) -> str:
    cleaned = "".join(ch.lower() if ch.isalnum() else " " for ch in value).strip()
    return " ".join(cleaned.split())


def _is_valid_chile_coordinate(lat: float, lng: float) -> bool:
    return -56.5 <= lat <= -17.0 and -76.8 <= lng <= -66.0


def _is_garbage_name(name: str) -> bool:
    normalized = _normalize_name(name)
    if not normalized or len(normalized) < 3:
        return True
    if "unidentified" in normalized or "unknown" in normalized or "unnamed" in normalized:
        return True
    garbage_tokens = {
        "unidentified mine",
        "unknown",
        "unnamed",
        "occurrence",
        "prospect",
    }
    if normalized in garbage_tokens:
        return True
    return normalized.startswith("unidentified ") or normalized.startswith("unknown ")


def _record_score(record: dict) -> tuple[int, int, int]:
    has_dep_id = 1 if record.get("dep_id") else 0
    named_bonus = 1 if not _is_garbage_name(str(record.get("name", ""))) else 0
    mineral_bonus = 1 if record.get("minerals") and record.get("minerals") != ["desconocido"] else 0
    quality = has_dep_id + named_bonus + mineral_bonus
    return (quality, len(str(record.get("name", ""))), len(str(record.get("source_url", ""))))


def _pick_best(existing: dict | None, candidate: dict) -> dict:
    if existing is None:
        return candidate
    if _record_score(candidate) > _record_score(existing):
        return candidate
    return existing


def _iter_mrds_records() -> tuple[list[dict], list[str]]:
    ns = {
        "gml": "http://www.opengis.net/gml",
        "ms": "http://mapserver.gis.umn.edu/mapserver",
    }
    records: list[dict] = []
    errors: list[str] = []

    for layer in MRDS_LAYERS:
        for min_lng, min_lat, max_lng, max_lat in MRDS_QUERY_BBOXES:
            params = {
                "service": "WFS",
                "version": "1.0.0",
                "request": "GetFeature",
                "typeName": layer,
                "maxFeatures": str(MRDS_MAX_FEATURES_PER_QUERY),
                "BBOX": f"{min_lng},{min_lat},{max_lng},{max_lat}",
            }
            try:
                xml_text = _request_text(MRDS_WFS_URL, params)
                root = ET.fromstring(xml_text)
            except Exception as exc:  # noqa: BLE001
                errors.append(f"{layer} bbox={min_lng},{min_lat},{max_lng},{max_lat}: {exc}")
                continue

            for member in root.findall(".//gml:featureMember", ns):
                feature = None
                for child in list(member):
                    feature = child
                    break
                if feature is None:
                    continue

                site_name = (feature.findtext("ms:site_name", default="", namespaces=ns) or "").strip()
                dep_id = (feature.findtext("ms:dep_id", default="", namespaces=ns) or "").strip()
                dev_stat = (feature.findtext("ms:dev_stat", default="", namespaces=ns) or "").strip()
                fips_code = (feature.findtext("ms:fips_code", default="", namespaces=ns) or "").strip()
                code_list = (feature.findtext("ms:code_list", default="", namespaces=ns) or "").strip()
                source_url = (feature.findtext("ms:url", default="", namespaces=ns) or "").strip()
                coord_text = feature.findtext(".//gml:coordinates", default="", namespaces=ns) or ""
                lat, lng = _parse_mrds_coordinates(coord_text)

                if not site_name or lat is None or lng is None:
                    continue

                records.append(
                    {
                        "dep_id": dep_id,
                        "fips_code": fips_code,
                        "name": site_name,
                        "minerals": _decode_mrds_minerals(code_list),
                        "latitude": lat,
                        "longitude": lng,
                        "site_type": _translate_dev_status(dev_stat or "Yacimiento"),
                        "source_url": source_url or "https://mrdata.usgs.gov/mrds/",
                    }
                )

    return records, errors


def scrape_mrds_chile_dataset() -> dict:
    records, errors = _iter_mrds_records()
    if not records:
        raise ValueError("USGS MRDS scraping produced 0 records. " + " | ".join(errors))

    invalid_coord_drop = 0
    garbage_drop = 0
    dedup_dep_drop = 0
    dedup_name_drop = 0
    dedup_coord_drop = 0
    dedup_exact_coord_drop = 0
    dedup_name_area_drop = 0
    non_chile_drop = 0

    by_dep_id: dict[str, dict] = {}
    without_dep_id: list[dict] = []
    for record in records:
        if record.get("fips_code") != "fCI":
            non_chile_drop += 1
            continue
        lat = record["latitude"]
        lng = record["longitude"]
        if not _is_valid_chile_coordinate(lat, lng):
            invalid_coord_drop += 1
            continue
        if _is_garbage_name(record["name"]):
            garbage_drop += 1
            continue
        dep_id = record.get("dep_id", "").strip()
        if dep_id:
            if dep_id in by_dep_id:
                previous = by_dep_id[dep_id]
                chosen = _pick_best(previous, record)
                if chosen is not previous:
                    dedup_dep_drop += 1
                    by_dep_id[dep_id] = chosen
                else:
                    dedup_dep_drop += 1
            else:
                by_dep_id[dep_id] = record
        else:
            without_dep_id.append(record)

    survivors = list(by_dep_id.values()) + without_dep_id
    by_name_coord: dict[tuple[str, float, float], dict] = {}
    for record in survivors:
        key = (_normalize_name(record["name"]), round(record["latitude"], 4), round(record["longitude"], 4))
        previous = by_name_coord.get(key)
        chosen = _pick_best(previous, record)
        if previous is not None and chosen is previous:
            dedup_name_drop += 1
        elif previous is not None:
            dedup_name_drop += 1
        by_name_coord[key] = chosen

    by_coord_mineral: dict[tuple[float, float, tuple[str, ...]], dict] = {}
    for record in by_name_coord.values():
        key = (round(record["latitude"], 3), round(record["longitude"], 3), tuple(sorted(record["minerals"])))
        previous = by_coord_mineral.get(key)
        chosen = _pick_best(previous, record)
        if previous is not None and chosen is previous:
            dedup_coord_drop += 1
        elif previous is not None:
            dedup_coord_drop += 1
        by_coord_mineral[key] = chosen

    by_exact_coord: dict[tuple[float, float], dict] = {}
    for record in by_coord_mineral.values():
        key = (record["latitude"], record["longitude"])
        previous = by_exact_coord.get(key)
        chosen = _pick_best(previous, record)
        if previous is not None and chosen is previous:
            dedup_exact_coord_drop += 1
        elif previous is not None:
            dedup_exact_coord_drop += 1
        by_exact_coord[key] = chosen

    by_name_area: dict[tuple[str, float, float], dict] = {}
    for record in by_exact_coord.values():
        key = (_normalize_name(record["name"]), round(record["latitude"], 2), round(record["longitude"], 2))
        previous = by_name_area.get(key)
        chosen = _pick_best(previous, record)
        if previous is not None and chosen is previous:
            dedup_name_area_drop += 1
        elif previous is not None:
            dedup_name_area_drop += 1
        by_name_area[key] = chosen

    cleaned = sorted(by_name_area.values(), key=lambda x: (_normalize_name(x["name"]), x["latitude"], x["longitude"]))
    if not cleaned:
        raise ValueError("USGS MRDS produced records but all were dropped by quality/coordinate filters.")

    now = utc_now_iso()
    items: list[dict] = []
    for next_id, record in enumerate(cleaned, start=1):
        dep_id = (record.get("dep_id") or "").strip()
        items.append(
            {
                "id": next_id,
                "name": record["name"],
                "minerals": record["minerals"],
                "latitude": record["latitude"],
                "longitude": record["longitude"],
                "region": "Chile",
                "site_type": record["site_type"] or "Yacimiento",
                "mining_company": "-",
                "surface": "-",
                "altitude": "-",
                "production": "-",
                "workforce": "-",
                "average_salary": "-",
                "annual_revenue": "-",
                "future_hirings": "-",
                "operation_since": "-",
                "direct_workers": "-",
                "indirect_workers": "-",
                "hiring_plan_2026": "-",
                "data_origin": "usgs-mrds",
                "confidence_score": 0.55,
                "enriched_at": now,
                "notes": "Dato obtenido por scraping de USGS MRDS (Chile).",
                "website": "#",
                "is_available_concession": False,
                "environmental_reports": [],
                "operating_authorizations": [],
                "geology_studies": [],
                "mineral_life_studies": [],
                "mitigation_studies": [],
                "sources": [
                    {
                        "name": "USGS MRDS",
                        "url": record["source_url"],
                        "note": f"dep_id={dep_id}" if dep_id else "Fuente WFS MRDS",
                    }
                ],
            }
        )

    stats = {
        "rawRecords": len(records),
        "keptRecords": len(items),
        "droppedInvalidCoordinates": invalid_coord_drop,
        "droppedGarbageNames": garbage_drop,
        "droppedDuplicatesDepId": dedup_dep_drop,
        "droppedDuplicatesNameCoord": dedup_name_drop,
        "droppedSuspiciousCoordMineral": dedup_coord_drop,
        "droppedDuplicatesExactCoord": dedup_exact_coord_drop,
        "droppedDuplicatesNameArea": dedup_name_area_drop,
        "droppedNonChile": non_chile_drop,
        "failedWindows": len(errors),
    }

    return {
        "meta": {
            "updatedAt": now,
            "version": 1,
            "source": "usgs-mrds",
            "sources": [
                {
                    "name": "USGS MRDS WFS",
                    "url": "https://mrdata.usgs.gov/services/mrds",
                    "note": "Capas high+low, ventanas geograficas, limpieza y deduplicacion para cobertura de Chile.",
                }
            ],
            "scrapeStats": stats,
        },
        "items": items,
    }


def _coord_cache_key(lat: float, lng: float) -> tuple[float, float]:
    return (round(float(lat), 4), round(float(lng), 4))


def _is_blank(value: str) -> bool:
    return not str(value or "").strip() or str(value).strip() == "-"


def _item_needs_reverse_geocoding(item: dict) -> bool:
    if not isinstance(item, dict):
        return False
    if not isinstance(item.get("latitude"), (int, float)) or not isinstance(item.get("longitude"), (int, float)):
        return False
    return _is_blank(str(item.get("city") or "")) or _is_blank(str(item.get("commune") or ""))


def _build_location_text(locality: str, commune: str, province: str) -> str:
    parts = [part.strip() for part in (locality, commune, province) if part and part.strip()]
    return ", ".join(parts)


def _extract_reverse_geocoding_fields(response: dict) -> dict[str, str]:
    address = response.get("address")
    if not isinstance(address, dict):
        address = {}
    city = str(
        address.get("city")
        or address.get("town")
        or address.get("village")
        or address.get("hamlet")
        or ""
    ).strip()
    commune = str(address.get("municipality") or address.get("county") or city).strip()
    province = str(address.get("state_district") or address.get("state") or address.get("region") or "").strip()
    locality = str(address.get("suburb") or address.get("neighbourhood") or "").strip()
    display_name = str(response.get("display_name") or "").strip()
    location = _build_location_text(locality, commune, province)
    return {
        "city": city,
        "commune": commune,
        "province": province,
        "locality": locality,
        "location": location,
        "address": display_name,
    }


def _fetch_reverse_geocode(lat: float, lng: float) -> dict[str, str]:
    params = {
        "format": "jsonv2",
        "lat": f"{lat:.6f}",
        "lon": f"{lng:.6f}",
        "zoom": "10",
        "addressdetails": "1",
        "accept-language": "es",
    }
    query = urlencode(params)
    source_url = f"{NOMINATIM_REVERSE_URL}?{query}"
    request = urllib.request.Request(
        source_url,
        method="GET",
        headers={"User-Agent": "MineralesChilenos/1.0 (reverse-geocoding-refresh)"},
    )
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(request, timeout=25, context=ctx) as response:
        payload = json.loads(response.read().decode("utf-8"))
    fields = _extract_reverse_geocoding_fields(payload if isinstance(payload, dict) else {})
    fields["source_url"] = source_url
    return fields


def _append_source(item: dict, source_name: str, source_url: str, note: str) -> None:
    if not source_url:
        return
    existing = item.get("sources")
    if not isinstance(existing, list):
        existing = []
        item["sources"] = existing
    if any(isinstance(row, dict) and str(row.get("url") or "") == source_url for row in existing):
        return
    existing.append({"name": source_name, "url": source_url, "note": note})


def enrich_city_commune_with_reverse_geocoding(payload: dict) -> tuple[dict, dict[str, int]]:
    items = payload.get("items")
    if not isinstance(items, list) or not items:
        return payload, {"reverseGeocodeCandidates": 0, "reverseGeocodeApplied": 0, "reverseGeocodeCacheHits": 0}

    candidates = [item for item in items if _item_needs_reverse_geocoding(item)]
    if not candidates:
        return payload, {"reverseGeocodeCandidates": 0, "reverseGeocodeApplied": 0, "reverseGeocodeCacheHits": 0}

    max_lookups = int(os.getenv("REVERSE_GEOCODE_MAX_LOOKUPS", str(DEFAULT_REVERSE_GEOCODE_MAX_LOOKUPS)))
    delay_seconds = float(
        os.getenv("REVERSE_GEOCODE_REQUEST_DELAY_SECONDS", str(DEFAULT_REVERSE_GEOCODE_DELAY_SECONDS))
    )
    if max_lookups < 0:
        max_lookups = 0
    if delay_seconds < 0:
        delay_seconds = 0.0

    unique_coords: dict[tuple[float, float], list[dict]] = {}
    for item in candidates:
        key = _coord_cache_key(float(item["latitude"]), float(item["longitude"]))
        unique_coords.setdefault(key, []).append(item)

    stats = {
        "reverseGeocodeCandidates": len(candidates),
        "reverseGeocodeApplied": 0,
        "reverseGeocodeCacheHits": 0,
        "reverseGeocodeRequested": 0,
        "reverseGeocodeErrors": 0,
        "reverseGeocodeCacheWrites": 0,
    }

    cached = get_reverse_geocode_cache(list(unique_coords.keys()))
    cache_to_write: list[dict] = []
    now = utc_now_iso()

    def apply_fields(target: dict, fields: dict[str, str], from_cache: bool) -> None:
        applied_any = False
        source_url = str(fields.get("source_url") or "")
        for field in ("city", "commune", "province", "locality", "location", "address"):
            incoming = str(fields.get(field) or "").strip()
            if not incoming:
                continue
            current_value = str(target.get(field) or "")
            if _is_blank(current_value):
                target[field] = incoming
                applied_any = True
                append_field_provenance(
                    target,
                    field_name=field,
                    field_value=incoming,
                    source_type="inferred",
                    source_url=source_url,
                    confidence_score=0.55 if from_cache else 0.6,
                    note="reverse geocoding cache" if from_cache else "reverse geocoding",
                    updated_at=now,
                )

        if applied_any:
            target["enriched_at"] = now
            _append_source(
                target,
                "OpenStreetMap Nominatim",
                source_url,
                "Reverse geocoding for city/commune enrichment" + (" (cache)" if from_cache else ""),
            )
            stats["reverseGeocodeApplied"] += 1

    for key, bucket in unique_coords.items():
        cached_fields = cached.get(key)
        if cached_fields:
            stats["reverseGeocodeCacheHits"] += 1
            for item in bucket:
                apply_fields(item, cached_fields, from_cache=True)
            continue

        if stats["reverseGeocodeRequested"] >= max_lookups:
            continue

        stats["reverseGeocodeRequested"] += 1
        try:
            fetched = _fetch_reverse_geocode(key[0], key[1])
            cache_to_write.append({"latitude": key[0], "longitude": key[1], **fetched})
            for item in bucket:
                apply_fields(item, fetched, from_cache=False)
        except Exception:  # noqa: BLE001
            stats["reverseGeocodeErrors"] += 1
        if delay_seconds > 0:
            time.sleep(delay_seconds)

    stats["reverseGeocodeCacheWrites"] = int(upsert_reverse_geocode_cache(cache_to_write))
    return payload, stats


def scrape_dataset_with_fallback() -> tuple[dict, str]:
    try:
        dataset = scrape_mrds_chile_dataset()
        return dataset, "USGS MRDS WFS"
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"USGS MRDS WFS scraping failed ({MRDS_WFS_URL}): {exc}") from exc


def main() -> int:
    source_url = os.getenv("DATA_JSON_SOURCE_URL", "").strip()
    source_mode = "rebuild"
    current: dict = {"meta": {}, "items": []}

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
        except Exception as exc:  # noqa: BLE001
            raise RuntimeError(f"Remote JSON refresh failed ({source_url}): {exc}") from exc
    else:
        scraped, source_name = scrape_dataset_with_fallback()
        current = scraped
        current.setdefault("meta", {})
        current["meta"]["scrapeSourceName"] = source_name
        source_mode = "scrape-rebuild"
    previous_snapshot = load_existing_dataset_safe()

    current, geocode_stats = enrich_city_commune_with_reverse_geocoding(current)
    current, applied_overrides = apply_manual_overrides(current)
    current, top_field_stats = enrich_top_fields_from_sources(current)
    current, sprint3_stats = enrich_sprint3_fields_from_sources(current)
    current, sprint4_stats = enrich_sprint4_studies_from_docs(current)
    current, seeded_provenance = seed_field_provenance(current)
    current, concession_stats = apply_concession_business_rule(current)
    current, completeness_stats = evaluate_record_completeness(current)

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
    for key, value in geocode_stats.items():
        stats[key] = int(value)
    for key, value in top_field_stats.items():
        stats[key] = int(value)
    for key, value in sprint3_stats.items():
        stats[key] = int(value)
    for key, value in sprint4_stats.items():
        stats[key] = int(value)
    for key, value in concession_stats.items():
        stats[key] = int(value)
    for key, value in completeness_stats.items():
        stats[key] = int(value)

    pending_curation = int(rebuild_manual_curation_queue(current))
    stats["manualCurationPending"] = pending_curation
    for key, value in compute_refresh_kpis(current, pending_curation).items():
        stats[key] = int(value)
    apply_production_alerts(stats)
    enforce_rollback_policy(previous_snapshot, current, stats)
    save_dataset(current)
    print(f"daily refresh complete mode={source_mode}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
