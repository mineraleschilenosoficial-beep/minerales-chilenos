#!/usr/bin/env python3
"""Refresh dataset and persist it exclusively into PostgreSQL."""

from __future__ import annotations

import json
import os
import ssl
import time
import urllib.request
import xml.etree.ElementTree as ET
from urllib.parse import urlencode

from storage import (
    apply_manual_overrides,
    append_field_provenance,
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

    current, geocode_stats = enrich_city_commune_with_reverse_geocoding(current)
    current, applied_overrides = apply_manual_overrides(current)

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
    for key, value in geocode_stats.items():
        stats[key] = int(value)

    save_dataset(current)
    pending_curation = int(rebuild_manual_curation_queue(current))
    stats["manualCurationPending"] = pending_curation
    print(f"daily refresh complete mode={source_mode}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
