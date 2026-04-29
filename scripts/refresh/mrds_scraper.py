from __future__ import annotations

import urllib.request
import xml.etree.ElementTree as ET
from urllib.parse import urlencode

from storage import utc_now_iso


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


def _request_text(url: str, params: dict[str, str]) -> str:
    query = urlencode(params)
    request = urllib.request.Request(
        f"{url}?{query}",
        method="GET",
        headers={"User-Agent": "Mozilla/5.0 (DailyRefresh)"},
    )
    with urllib.request.urlopen(request, timeout=45) as response:
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


def _extract_records_from_feature_root(root: ET.Element, ns: dict[str, str]) -> list[dict]:
    rows: list[dict] = []
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

        rows.append(
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
    return rows


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

            records.extend(_extract_records_from_feature_root(root, ns))

    return records, errors


def _iter_mrds_records_curated(targets: list[dict]) -> tuple[list[dict], list[str]]:
    ns = {
        "gml": "http://www.opengis.net/gml",
        "ms": "http://mapserver.gis.umn.edu/mapserver",
    }
    records: list[dict] = []
    errors: list[str] = []
    if not targets:
        return records, errors

    for target in targets:
        name_norm = _normalize_name(str(target.get("name_normalized") or ""))
        lat = _to_float(target.get("latitude"))
        lng = _to_float(target.get("longitude"))
        radius = _to_float(target.get("radius_deg")) or 0.05
        if not name_norm or lat is None or lng is None:
            continue
        query_radius = max(0.03, min(0.20, radius * 1.6))
        min_lng, min_lat = lng - query_radius, lat - query_radius
        max_lng, max_lat = lng + query_radius, lat + query_radius
        match_radius = max(0.03, min(0.15, radius * 1.2))

        for layer in MRDS_LAYERS:
            params = {
                "service": "WFS",
                "version": "1.0.0",
                "request": "GetFeature",
                "typeName": layer,
                "maxFeatures": "200",
                "BBOX": f"{min_lng},{min_lat},{max_lng},{max_lat}",
            }
            try:
                xml_text = _request_text(MRDS_WFS_URL, params)
                root = ET.fromstring(xml_text)
            except Exception as exc:  # noqa: BLE001
                errors.append(f"{layer} target={name_norm} bbox={min_lng},{min_lat},{max_lng},{max_lat}: {exc}")
                continue

            for row in _extract_records_from_feature_root(root, ns):
                if _normalize_name(str(row.get("name") or "")) != name_norm:
                    continue
                row_lat = _to_float(row.get("latitude"))
                row_lng = _to_float(row.get("longitude"))
                if row_lat is None or row_lng is None:
                    continue
                if abs(row_lat - lat) > match_radius or abs(row_lng - lng) > match_radius:
                    continue
                records.append(row)

    return records, errors


def scrape_mrds_chile_dataset(curated_targets: list[dict] | None = None) -> dict:
    if curated_targets:
        records, errors = _iter_mrds_records_curated(curated_targets)
    else:
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
