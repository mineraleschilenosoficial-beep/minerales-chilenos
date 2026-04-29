from __future__ import annotations

import os
from urllib.parse import urlparse

from .refresh_helpers import (
    collect_url_set,
    normalize_doc_entry,
    ensure_item_list,
    env_enabled,
    extract_first_year,
    extract_hiring_2026,
    extract_number_from_keyword,
    extract_revenue,
    extract_salary,
    is_present,
    list_has_http_url,
    normalized_doc_rows,
)
from storage import append_field_provenance, utc_now_iso


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
FALLBACK_SCALAR_FIELDS = (
    "mining_company",
    "operation_since",
    "direct_workers",
    "indirect_workers",
    "average_salary",
    "annual_revenue",
    "hiring_plan_2026",
)
FALLBACK_DOC_FIELD_LABELS = (
    ("operating_authorizations", "Registry fallback authorization reference"),
    ("environmental_reports", "Registry fallback environmental reference"),
    ("geology_studies", "Registry fallback geology reference"),
    ("mineral_life_studies", "Registry fallback mineral-life reference"),
    ("mitigation_studies", "Registry fallback mitigation reference"),
)


def item_has_official_source(item: dict) -> bool:
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

        source_rows = normalized_doc_rows(item.get("sources"))
        doc_rows = normalized_doc_rows(item.get("docs"))

        current_website = str(item.get("website") or "").strip()
        if not is_present(current_website):
            for src in source_rows + doc_rows:
                url = src["url"]
                if not _looks_like_valid_external_website(url):
                    continue
                item["website"] = url
                append_field_provenance(
                    item,
                    field_name="website",
                    field_value=url,
                    source_type="official" if item_has_official_source(item) else "source",
                    source_url=url,
                    confidence_score=0.65,
                    note="auto extracted from source catalog",
                    updated_at=now,
                )
                stats["topFieldWebsiteExtracted"] += 1
                break

        current_company = str(item.get("mining_company") or "").strip()
        if not is_present(current_company):
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

        existing_auth = ensure_item_list(item, "operating_authorizations")
        existing_env = ensure_item_list(item, "environmental_reports")
        auth_urls = collect_url_set(existing_auth)
        env_urls = collect_url_set(existing_env)

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
        rows = [normalize_doc_entry(x) for x in (item.get("sources") or [])]
        rows += [normalize_doc_entry(x) for x in (item.get("docs") or [])]
        rows = [x for x in rows if x]
        if not rows:
            continue

        for row in rows:
            source_url = row["url"]
            text_blob = " ".join((row["name"], row["note"], row["doc_type"], source_url))
            lower_blob = text_blob.lower()

            if not is_present(item.get("direct_workers")):
                direct = extract_number_from_keyword(lower_blob, r"(direct|directos?)")
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

            if not is_present(item.get("indirect_workers")):
                indirect = extract_number_from_keyword(lower_blob, r"(indirect|indirectos?)")
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

            if not is_present(item.get("average_salary")):
                salary = extract_salary(text_blob)
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

            if not is_present(item.get("annual_revenue")):
                revenue = extract_revenue(text_blob)
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

            if not is_present(item.get("operation_since")):
                year = extract_first_year(text_blob)
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

            if not is_present(item.get("hiring_plan_2026")):
                hiring = extract_hiring_2026(lower_blob)
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
        doc_rows = normalized_doc_rows(item.get("docs"))
        if not doc_rows:
            continue

        geology = ensure_item_list(item, "geology_studies")
        mineral_life = ensure_item_list(item, "mineral_life_studies")
        mitigation = ensure_item_list(item, "mitigation_studies")

        geology_urls = collect_url_set(geology)
        mineral_life_urls = collect_url_set(mineral_life)
        mitigation_urls = collect_url_set(mitigation)

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


def first_source_url(item: dict) -> str:
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


def apply_bulk_fallback_enrichment(payload: dict) -> tuple[dict, dict[str, int]]:
    items = payload.get("items")
    if not isinstance(items, list):
        return payload, {
            "fallbackWebsiteFilled": 0,
            "fallbackDocsFilled": 0,
            "fallbackNotPublicScalarsFilled": 0,
        }

    use_source_as_website = env_enabled("AUTO_FILL_WEBSITE_FROM_SOURCE", "true")
    fill_not_public_scalars = env_enabled("AUTO_FILL_NOT_PUBLIC_FIELDS", "false")
    fill_doc_lists = env_enabled("AUTO_FILL_DOC_FIELDS_FROM_SOURCE", "true")

    stats = {
        "fallbackWebsiteFilled": 0,
        "fallbackDocsFilled": 0,
        "fallbackNotPublicScalarsFilled": 0,
    }
    now = utc_now_iso()

    for item in items:
        if not isinstance(item, dict):
            continue
        source_url = first_source_url(item)
        if not source_url:
            continue

        if use_source_as_website and not is_present(item.get("website")):
            item["website"] = source_url
            append_field_provenance(
                item,
                field_name="website",
                field_value=source_url,
                source_type="registry",
                source_url=source_url,
                confidence_score=0.45,
                note="fallback website from primary registry source",
                updated_at=now,
            )
            stats["fallbackWebsiteFilled"] += 1

        if fill_not_public_scalars:
            for field_name in FALLBACK_SCALAR_FIELDS:
                if is_present(item.get(field_name)):
                    continue
                item[field_name] = "not_public"
                append_field_provenance(
                    item,
                    field_name=field_name,
                    field_value="not_public",
                    source_type="policy",
                    source_url=source_url,
                    confidence_score=0.7,
                    note="no public mine-level source available at refresh time",
                    updated_at=now,
                )
                stats["fallbackNotPublicScalarsFilled"] += 1

        if fill_doc_lists:
            changed_docs = False
            for field_name, label in FALLBACK_DOC_FIELD_LABELS:
                rows = ensure_item_list(item, field_name)
                if list_has_http_url(rows):
                    continue
                rows.append(
                    {
                        "name": label,
                        "url": source_url,
                        "note": "fallback from primary public registry source",
                        "doc_type": "registry",
                    }
                )
                changed_docs = True
                stats["fallbackDocsFilled"] += 1
            if changed_docs and not str(item.get("enriched_at") or "").strip():
                item["enriched_at"] = now

    return payload, stats
