from __future__ import annotations

import csv
import io
import math
import ssl
import urllib.request
from typing import Any

from scripts.storage import append_field_provenance, utc_now_iso


DEFAULT_MINES_CSV_URL = (
    "https://datos.gob.cl/dataset/413064b2-aa5c-4ace-b429-323c40161fa5/"
    "resource/4553d1f8-92fe-4007-9ce3-520db1540a64/download/faenas-en-chile.csv"
)
DEFAULT_QUERY_TIMEOUT_SECONDS = 45.0

CHILE_LAT_MIN = -56.5
CHILE_LAT_MAX = -17.0
CHILE_LNG_MIN = -76.5
CHILE_LNG_MAX = -66.0
COMMUNE_OUTLIER_DISTANCE_KM = 260.0
COMMUNE_MIN_POINTS_FOR_OUTLIER_CHECK = 5

REGION_CODE_TO_NAME = {
    "15": "Arica y Parinacota",
    "1": "Tarapaca",
    "2": "Antofagasta",
    "3": "Atacama",
    "4": "Coquimbo",
    "5": "Valparaiso",
    "13": "Metropolitana de Santiago",
    "6": "O'Higgins",
    "7": "Maule",
    "16": "Nuble",
    "8": "Biobio",
    "9": "La Araucania",
    "14": "Los Rios",
    "10": "Los Lagos",
    "11": "Aysen",
    "12": "Magallanes",
}

REGION_BOUNDS = {
    "Arica y Parinacota": (-19.5, -17.0, -70.9, -68.0),
    "Tarapaca": (-21.9, -18.9, -71.8, -68.0),
    "Antofagasta": (-26.5, -21.5, -73.0, -66.5),
    "Atacama": (-29.7, -25.0, -72.5, -68.0),
    "Coquimbo": (-32.7, -28.8, -72.3, -69.5),
    "Valparaiso": (-34.9, -32.1, -72.3, -70.0),
    "Metropolitana de Santiago": (-34.3, -32.8, -71.5, -69.6),
    "O'Higgins": (-35.4, -33.5, -72.2, -69.8),
    "Maule": (-36.8, -34.3, -73.3, -70.0),
    "Nuble": (-37.8, -36.2, -73.3, -71.0),
    "Biobio": (-38.9, -36.3, -74.0, -71.0),
    "La Araucania": (-39.8, -37.3, -73.9, -70.8),
    "Los Rios": (-40.9, -39.0, -74.2, -72.0),
    "Los Lagos": (-44.9, -40.2, -75.0, -71.2),
    "Aysen": (-49.5, -43.0, -75.0, -71.0),
    "Magallanes": (-56.5, -48.0, -76.0, -66.0),
}


def _normalize_text(value: Any) -> str:
    raw = " ".join(str(value or "").strip().split())
    if not raw:
        return ""
    return " ".join(token.capitalize() for token in raw.lower().split(" "))


def _split_minerals(*values: Any) -> list[str]:
    out: list[str] = []
    for value in values:
        text = str(value or "").strip()
        if not text:
            continue
        for token in text.replace("/", ",").replace(";", ",").split(","):
            mineral = _normalize_text(token)
            if not mineral:
                continue
            if mineral not in out:
                out.append(mineral)
    return out or ["Desconocido"]


def _to_float(value: Any) -> float | None:
    try:
        return float(str(value).strip().replace(",", "."))
    except Exception:  # noqa: BLE001
        return None


def _inside_chile(lat: float, lng: float) -> bool:
    return CHILE_LAT_MIN <= lat <= CHILE_LAT_MAX and CHILE_LNG_MIN <= lng <= CHILE_LNG_MAX


def _inside_region_bounds(region_name: str, lat: float, lng: float) -> bool:
    bounds = REGION_BOUNDS.get(region_name)
    if not bounds:
        return False
    lat_min, lat_max, lng_min, lng_max = bounds
    return lat_min <= lat <= lat_max and lng_min <= lng <= lng_max


def _region_from_coordinates(lat: float, lng: float) -> str:
    for region_name, (lat_min, lat_max, lng_min, lng_max) in REGION_BOUNDS.items():
        if lat_min <= lat <= lat_max and lng_min <= lng <= lng_max:
            return region_name
    return "Chile"


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _download_csv_rows(csv_url: str, timeout_seconds: float) -> list[dict[str, str]]:
    request = urllib.request.Request(csv_url, method="GET", headers={"User-Agent": "Mozilla/5.0 (MinesRefresh)"})
    context = ssl.create_default_context()
    with urllib.request.urlopen(request, timeout=timeout_seconds, context=context) as response:
        payload = response.read()

    text: str | None = None
    for encoding in ("utf-8-sig", "utf-8", "latin-1", "cp1252"):
        try:
            text = payload.decode(encoding)
            break
        except Exception:  # noqa: BLE001
            continue
    if text is None:
        raise ValueError("Unable to decode mines CSV with common encodings")

    reader = csv.DictReader(io.StringIO(text))
    rows: list[dict[str, str]] = []
    for row in reader:
        rows.append({str(k): str(v or "") for k, v in row.items()})
    return rows


def build_dataset_from_open_mines() -> tuple[dict[str, Any], dict[str, int]]:
    now = utc_now_iso()
    csv_url = DEFAULT_MINES_CSV_URL
    timeout_seconds = DEFAULT_QUERY_TIMEOUT_SECONDS
    rows = _download_csv_rows(csv_url, timeout_seconds)
    if not rows:
        raise ValueError("Open mines CSV returned 0 rows")

    stats = {
        "sourceRecordsRaw": len(rows),
        "sourceRecordsKept": 0,
        "sourceRecordsMissingContextFields": 0,
        "sourceRecordsDroppedInvalidCoordinates": 0,
        "sourceRecordsDroppedOutsideChileBounds": 0,
        "sourceRecordsRegionMismatchDetected": 0,
        "sourceRecordsRegionRelabeledFromCoordinates": 0,
        "sourceRecordsDroppedCommuneOutlier": 0,
    }

    stage_rows: list[dict[str, Any]] = []
    for row in rows:
        lng = _to_float(row.get("Este"))
        lat = _to_float(row.get("Norte"))
        if lat is None or lng is None:
            stats["sourceRecordsDroppedInvalidCoordinates"] += 1
            continue
        if not _inside_chile(lat, lng):
            stats["sourceRecordsDroppedOutsideChileBounds"] += 1
            continue

        company_raw = _normalize_text(row.get("NOMBRE EM"))
        region_code = str(row.get("REGION FA") or "").strip()
        region_name_raw = REGION_CODE_TO_NAME.get(region_code, "")
        commune_raw = _normalize_text(row.get("COMUNA F"))

        inferred_region = _region_from_coordinates(lat, lng)
        if inferred_region != "Chile" and region_name_raw and inferred_region != region_name_raw:
            stats["sourceRecordsRegionMismatchDetected"] += 1
            stats["sourceRecordsRegionRelabeledFromCoordinates"] += 1

        final_region = (
            inferred_region
            if inferred_region and inferred_region != "Chile"
            else (region_name_raw or "Sin region")
        )
        final_company = company_raw or "Sin empresa"
        final_commune = commune_raw or "Sin comuna"
        if not (company_raw and region_name_raw and commune_raw):
            stats["sourceRecordsMissingContextFields"] += 1

        stage_rows.append(
            {
                "source_id": str(row.get("ID") or "").strip(),
                "lat": lat,
                "lng": lng,
                "company": final_company,
                "region": final_region,
                "region_code": region_code,
                "commune": final_commune,
                "site_name": _normalize_text(row.get("NOMBRE F")) or f"Faena {row.get('ID') or '-'}",
                "category": _normalize_text(row.get("CATEGORIA")) or "-",
                "mine_type": _normalize_text(row.get("TIPO INST")) or "Mina",
                "minerals": _split_minerals(row.get("RECURSO M"), row.get("RECURSO P"), row.get("TIPO RECU")),
                "status": _normalize_text(row.get("ESTADO")) or "-",
            }
        )

    commune_points: dict[tuple[str, str], list[tuple[float, float]]] = {}
    for row in stage_rows:
        key = (str(row["region"]), str(row["commune"]))
        commune_points.setdefault(key, []).append((float(row["lat"]), float(row["lng"])))

    commune_centroids: dict[tuple[str, str], tuple[float, float]] = {}
    for key, points in commune_points.items():
        if len(points) < COMMUNE_MIN_POINTS_FOR_OUTLIER_CHECK:
            continue
        centroid_lat = sum(p[0] for p in points) / len(points)
        centroid_lng = sum(p[1] for p in points) / len(points)
        commune_centroids[key] = (centroid_lat, centroid_lng)

    items: list[dict[str, Any]] = []
    next_id = 1
    for row in stage_rows:
        key = (str(row["region"]), str(row["commune"]))
        centroid = commune_centroids.get(key)
        if centroid is not None:
            distance_km = _haversine_km(float(row["lat"]), float(row["lng"]), centroid[0], centroid[1])
            if distance_km > COMMUNE_OUTLIER_DISTANCE_KM:
                stats["sourceRecordsDroppedCommuneOutlier"] += 1
                continue

        note = (
            "Datos Abiertos Chile - Faenas en Chile; "
            f"empresa={row['company']}; region={row['region']}; comuna={row['commune']}; "
            f"categoria={row['category']}; estado={row['status']}"
        )

        item = {
            "id": next_id,
            "name": str(row["site_name"]),
            "minerals": list(row["minerals"]),
            "latitude": float(row["lat"]),
            "longitude": float(row["lng"]),
            "region": str(row["region"]),
            "commune": str(row["commune"]),
            "city": str(row["commune"]),
            "site_type": str(row["mine_type"]),
            "mining_company": str(row["company"]),
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
            "data_origin": "datos-gob-cl-faenas",
            "confidence_score": 0.82,
            "enriched_at": now,
            "notes": note,
            "website": "#",
            "is_available_concession": False,
            "environmental_reports": [],
            "operating_authorizations": [],
            "geology_studies": [],
            "mineral_life_studies": [],
            "mitigation_studies": [],
            "sources": [
                {
                    "name": "Datos Abiertos Chile - Faenas en Chile",
                    "url": csv_url,
                    "note": note,
                }
            ],
        }
        append_field_provenance(
            item,
            field_name="mining_company",
            field_value=str(row["company"]),
            source_type="official",
            source_url=csv_url,
            confidence_score=0.9,
            note=note,
            updated_at=now,
        )
        append_field_provenance(
            item,
            field_name="region",
            field_value=str(row["region"]),
            source_type="official",
            source_url=csv_url,
            confidence_score=0.9,
            note=note,
            updated_at=now,
        )
        append_field_provenance(
            item,
            field_name="commune",
            field_value=str(row["commune"]),
            source_type="official",
            source_url=csv_url,
            confidence_score=0.9,
            note=note,
            updated_at=now,
        )

        items.append(item)
        next_id += 1

    if not items:
        raise ValueError("Open mines source yielded 0 valid items after quality filters")

    stats["sourceRecordsKept"] = len(items)
    dataset = {
        "meta": {
            "updatedAt": now,
            "lastVerifiedAt": now,
            "version": 1,
            "source": "datos-gob-cl-faenas",
            "refreshMode": "mines-open-data",
            "sources": [
                {
                    "name": "Portal de Datos Abiertos - Faenas en Chile (CSV)",
                    "url": csv_url,
                    "note": "Incluye empresa, region, comuna y coordenadas de faenas.",
                }
            ],
            "scrapeStats": stats,
        },
        "items": items,
    }
    return dataset, stats
