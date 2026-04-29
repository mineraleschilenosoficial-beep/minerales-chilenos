from __future__ import annotations

import json
import math
import os
import ssl
import urllib.request
from urllib.parse import urlencode

from storage import append_field_provenance, utc_now_iso


DEFAULT_SERNAGEOMIN_CONCESSION_LAYER_URL = (
    "https://services1.arcgis.com/OyjvVdFTl5hfSdX3/ArcGIS/rest/services/Marcelo_Layer/FeatureServer/2"
)
DEFAULT_QUERY_PAGE_SIZE = 2000
DEFAULT_QUERY_TIMEOUT_SECONDS = 20.0
CHILE_LAT_MIN = -56.5
CHILE_LAT_MAX = -17.0
CHILE_LNG_MIN = -76.5
CHILE_LNG_MAX = -66.0
COMMUNE_OUTLIER_DISTANCE_KM = 260.0
COMMUNE_MIN_POINTS_FOR_OUTLIER_CHECK = 5
MAX_DROP_SAMPLES_PER_REASON = 25

REGION_BOUNDS = (
    # name, lat_min, lat_max, lng_min, lng_max
    ("Arica y Parinacota", -19.5, -17.0, -70.9, -68.0),
    ("Tarapaca", -21.9, -18.9, -71.8, -68.0),
    ("Antofagasta", -26.5, -21.5, -73.0, -66.5),
    ("Atacama", -29.7, -25.0, -72.5, -68.0),
    ("Coquimbo", -32.7, -28.8, -72.3, -69.5),
    ("Valparaiso", -34.9, -32.1, -72.3, -70.0),
    ("Metropolitana de Santiago", -34.3, -32.8, -71.5, -69.6),
    ("O'Higgins", -35.4, -33.5, -72.2, -69.8),
    ("Maule", -36.8, -34.3, -73.3, -70.0),
    ("Nuble", -37.8, -36.2, -73.3, -71.0),
    ("Biobio", -38.9, -36.3, -74.0, -71.0),
    ("La Araucania", -39.8, -37.3, -73.9, -70.8),
    ("Los Rios", -40.9, -39.0, -74.2, -72.0),
    ("Los Lagos", -44.9, -40.2, -75.0, -71.2),
    ("Aysen", -49.5, -43.0, -75.0, -71.0),
    ("Magallanes", -56.5, -48.0, -76.0, -66.0),
)


def _to_float(value) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.replace(",", "."))
        except ValueError:
            return None
    return None


def _normalize_status(value: str) -> str:
    return " ".join(str(value or "").strip().upper().split())


def _normalize_text(value: str) -> str:
    raw = " ".join(str(value or "").strip().split())
    if not raw:
        return ""
    return " ".join(token.capitalize() for token in raw.lower().split(" "))


def _format_concession_type(value: str) -> str:
    normalized = _normalize_status(value)
    if normalized == "EXPLOTACION":
        return "Explotacion"
    if normalized == "EXPLORACION":
        return "Exploracion"
    return _normalize_text(value)


def _format_concession_status(value: str) -> str:
    normalized = _normalize_status(value)
    if normalized == "EN TRAMITE":
        return "En tramite"
    if normalized == "CONSTITUIDA":
        return "Constituida"
    if normalized == "ELIMINADA":
        return "Eliminada"
    return _normalize_text(value)


def _is_valid_lat_lng(lat: float, lng: float) -> bool:
    return -90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0


def _is_inside_chile_bounds(lat: float, lng: float) -> bool:
    return CHILE_LAT_MIN <= lat <= CHILE_LAT_MAX and CHILE_LNG_MIN <= lng <= CHILE_LNG_MAX


def _region_from_coordinates(lat: float, lng: float) -> str:
    for region_name, lat_min, lat_max, lng_min, lng_max in REGION_BOUNDS:
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


def _extract_point_from_feature(feature: dict) -> tuple[float | None, float | None]:
    if not isinstance(feature, dict):
        return None, None
    centroid = feature.get("centroid")
    if isinstance(centroid, dict):
        lat = _to_float(centroid.get("y"))
        lng = _to_float(centroid.get("x"))
        if lat is not None and lng is not None and _is_valid_lat_lng(lat, lng):
            return lat, lng

    geometry = feature.get("geometry")
    if not isinstance(geometry, dict):
        return None, None

    if "x" in geometry and "y" in geometry:
        lat = _to_float(geometry.get("y"))
        lng = _to_float(geometry.get("x"))
        if lat is not None and lng is not None and _is_valid_lat_lng(lat, lng):
            return lat, lng
        return None, None

    rings = geometry.get("rings")
    if not isinstance(rings, list):
        return None, None
    points: list[tuple[float, float]] = []
    for ring in rings:
        if not isinstance(ring, list):
            continue
        for point in ring:
            if not isinstance(point, list) or len(point) < 2:
                continue
            lng = _to_float(point[0])
            lat = _to_float(point[1])
            if lat is None or lng is None:
                continue
            if not _is_valid_lat_lng(lat, lng):
                continue
            points.append((lat, lng))
    if not points:
        return None, None
    lat = sum(p[0] for p in points) / len(points)
    lng = sum(p[1] for p in points) / len(points)
    if not _is_valid_lat_lng(lat, lng):
        return None, None
    return lat, lng


def _append_drop_sample(
    bucket: list[dict[str, object]],
    *,
    reason: str,
    attrs: dict,
    lat: float | None = None,
    lng: float | None = None,
    extra: dict[str, object] | None = None,
) -> None:
    if len(bucket) >= MAX_DROP_SAMPLES_PER_REASON:
        return
    sample = {
        "reason": reason,
        "objectid": attrs.get("OBJECTID"),
        "name": str(attrs.get("NOMBRE") or "").strip(),
        "commune": _normalize_text(str(attrs.get("COMUNA") or "").strip()) or "-",
        "status": _normalize_status(str(attrs.get("SITUACION_CONCESION") or "").strip()),
        "type": str(attrs.get("TIPO_CONCESION") or "").strip().upper(),
    }
    if lat is not None and lng is not None:
        sample["latitude"] = round(float(lat), 6)
        sample["longitude"] = round(float(lng), 6)
    if isinstance(extra, dict):
        sample.update(extra)
    bucket.append(sample)


def _request_json(url: str, params: dict[str, str], timeout_seconds: float) -> dict:
    query = urlencode(params)
    request = urllib.request.Request(
        f"{url}?{query}",
        method="GET",
        headers={"User-Agent": "Mozilla/5.0 (SernageominRefresh)"},
    )
    context = ssl.create_default_context()
    with urllib.request.urlopen(request, timeout=timeout_seconds, context=context) as response:
        payload = json.loads(response.read().decode("utf-8", "ignore"))
    if not isinstance(payload, dict):
        raise ValueError("SERNAGEOMIN response must be a JSON object")
    return payload


def _iter_sernageomin_features(
    layer_url: str,
    timeout_seconds: float,
    page_size: int,
    max_records: int = 0,
) -> list[dict]:
    query_url = layer_url.rstrip("/") + "/query"
    rows: list[dict] = []
    offset = 0

    while True:
        params = {
            "f": "json",
            "where": "1=1",
            "outFields": (
                "OBJECTID,NUMERO_ROL,DV_ROL,NOMBRE,HECTAREAS,FECHA_VENCIMIENTO,"
                "SITUACION_CONCESION,TIPO_CONCESION,COMUNA,TITULAR_NOMBRE,ANO_INSCRIPCION,ID_CONCESION,ID_COMUNA"
            ),
            "returnGeometry": "true",
            "outSR": "4326",
            "orderByFields": "OBJECTID ASC",
            "resultOffset": str(offset),
            "resultRecordCount": str(page_size),
        }
        payload = _request_json(query_url, params, timeout_seconds)
        features = payload.get("features")
        if not isinstance(features, list) or not features:
            break
        rows.extend(features)
        if max_records > 0 and len(rows) >= max_records:
            rows = rows[:max_records]
            break
        if len(features) < page_size:
            break
        offset += len(features)

    return rows


def build_dataset_from_sernageomin() -> tuple[dict, dict[str, int]]:
    layer_url = str(
        os.getenv("SERNAGEOMIN_CONCESSION_LAYER_URL", DEFAULT_SERNAGEOMIN_CONCESSION_LAYER_URL)
    ).strip()
    if not layer_url:
        raise ValueError("SERNAGEOMIN_CONCESSION_LAYER_URL is empty")

    timeout_seconds = float(
        os.getenv("SERNAGEOMIN_CONCESSION_TIMEOUT_SECONDS", str(DEFAULT_QUERY_TIMEOUT_SECONDS))
    )
    page_size = int(os.getenv("SERNAGEOMIN_CONCESSION_PAGE_SIZE", str(DEFAULT_QUERY_PAGE_SIZE)) or DEFAULT_QUERY_PAGE_SIZE)
    if page_size < 200:
        page_size = 200
    if page_size > 2000:
        page_size = 2000
    max_records = int(os.getenv("SERNAGEOMIN_MAX_RECORDS", "0") or 0)
    if max_records < 0:
        max_records = 0

    features = _iter_sernageomin_features(
        layer_url,
        timeout_seconds=timeout_seconds,
        page_size=page_size,
        max_records=max_records,
    )
    if not features:
        raise ValueError("SERNAGEOMIN query returned 0 features")

    now = utc_now_iso()
    items: list[dict] = []
    stats = {
        "sourceRecordsRaw": len(features),
        "sourceRecordsMaxRequested": max_records,
        "sourceRecordsKept": 0,
        "sourceRecordsDroppedNoCoords": 0,
        "sourceRecordsDroppedOutOfChileBounds": 0,
        "sourceRecordsDroppedCommuneOutlier": 0,
        "concessionStatusConstituida": 0,
        "concessionStatusEnTramite": 0,
        "concessionStatusEliminada": 0,
        "availableConcessionTrueCount": 0,
        "availableConcessionFalseCount": 0,
    }
    drop_samples = {
        "missing_coordinates": [],
        "outside_chile_bounds": [],
        "commune_outlier": [],
    }

    records: list[dict] = []
    for feature in features:
        attrs = feature.get("attributes")
        if not isinstance(attrs, dict):
            continue
        lat, lng = _extract_point_from_feature(feature)
        if lat is None or lng is None:
            stats["sourceRecordsDroppedNoCoords"] += 1
            _append_drop_sample(
                drop_samples["missing_coordinates"],
                reason="missing_coordinates",
                attrs=attrs,
            )
            continue
        if not _is_inside_chile_bounds(lat, lng):
            stats["sourceRecordsDroppedOutOfChileBounds"] += 1
            _append_drop_sample(
                drop_samples["outside_chile_bounds"],
                reason="outside_chile_bounds",
                attrs=attrs,
                lat=lat,
                lng=lng,
            )
            continue

        status_raw = str(attrs.get("SITUACION_CONCESION") or "").strip()
        status_norm = _normalize_status(status_raw)
        concession_type = str(attrs.get("TIPO_CONCESION") or "").strip().upper() or "-"
        concession_type_label = _format_concession_type(concession_type)
        rol_number = str(attrs.get("NUMERO_ROL") or "").strip()
        rol_dv = str(attrs.get("DV_ROL") or "").strip()
        rol = f"{rol_number}-{rol_dv}" if rol_number and rol_dv else rol_number or "-"
        holder = _normalize_text(str(attrs.get("TITULAR_NOMBRE") or "").strip())
        inscription_year = str(attrs.get("ANO_INSCRIPCION") or "").strip()
        commune = _normalize_text(str(attrs.get("COMUNA") or "").strip()) or "-"
        commune_code = str(attrs.get("ID_COMUNA") or "").strip()
        id_concession = str(attrs.get("ID_CONCESION") or "").strip()
        name = _normalize_text(str(attrs.get("NOMBRE") or "").strip()) or f"Concesion {rol}"
        status_label = _format_concession_status(status_norm)
        records.append(
            {
                "lat": lat,
                "lng": lng,
                "status_norm": status_norm,
                "status_label": status_label,
                "concession_type": concession_type,
                "concession_type_label": concession_type_label,
                "rol": rol,
                "holder": holder,
                "inscription_year": inscription_year,
                "commune": commune,
                "commune_code": commune_code,
                "id_concession": id_concession,
                "name": name,
            }
        )

    commune_points: dict[str, list[tuple[float, float]]] = {}
    for record in records:
        commune = str(record["commune"])
        if commune == "-":
            continue
        commune_points.setdefault(commune, []).append((float(record["lat"]), float(record["lng"])))

    commune_centroids: dict[str, tuple[float, float]] = {}
    for commune, points in commune_points.items():
        if len(points) < COMMUNE_MIN_POINTS_FOR_OUTLIER_CHECK:
            continue
        centroid_lat = sum(p[0] for p in points) / len(points)
        centroid_lng = sum(p[1] for p in points) / len(points)
        commune_centroids[commune] = (centroid_lat, centroid_lng)

    next_id = 1
    for record in records:
        lat = float(record["lat"])
        lng = float(record["lng"])
        commune = str(record["commune"])
        centroid = commune_centroids.get(commune)
        if centroid is not None:
            distance_km = _haversine_km(lat, lng, centroid[0], centroid[1])
            if distance_km > COMMUNE_OUTLIER_DISTANCE_KM:
                stats["sourceRecordsDroppedCommuneOutlier"] += 1
                _append_drop_sample(
                    drop_samples["commune_outlier"],
                    reason="commune_outlier",
                    attrs={
                        "OBJECTID": None,
                        "NOMBRE": record["name"],
                        "COMUNA": commune,
                        "SITUACION_CONCESION": record["status_norm"],
                        "TIPO_CONCESION": record["concession_type_label"],
                    },
                    lat=lat,
                    lng=lng,
                    extra={
                        "distance_km": round(distance_km, 2),
                        "centroid_latitude": round(float(centroid[0]), 6),
                        "centroid_longitude": round(float(centroid[1]), 6),
                    },
                )
                continue

        status_norm = str(record["status_norm"])
        concession_type = str(record["concession_type"])
        concession_type_label = str(record["concession_type_label"])
        rol = str(record["rol"])
        holder = str(record["holder"])
        inscription_year = str(record["inscription_year"])
        id_concession = str(record["id_concession"])
        name = str(record["name"])
        commune_code = str(record["commune_code"])
        status_label = str(record["status_label"])
        region = _region_from_coordinates(lat, lng)
        is_available = status_norm == "ELIMINADA"

        if status_norm == "CONSTITUIDA":
            stats["concessionStatusConstituida"] += 1
        elif status_norm == "EN TRAMITE":
            stats["concessionStatusEnTramite"] += 1
        elif status_norm == "ELIMINADA":
            stats["concessionStatusEliminada"] += 1

        if is_available:
            stats["availableConcessionTrueCount"] += 1
        else:
            stats["availableConcessionFalseCount"] += 1

        note = (
            "Catastro minero SERNAGEOMIN; "
            f"rol={rol}; situacion={status_label or '-'}; tipo={concession_type_label}; "
            f"comuna={commune}; region={region}; id_comuna={commune_code or '-'}; "
            f"id_concesion={id_concession or '-'}"
        )
        item = {
            "id": next_id,
            "name": name,
            "minerals": ["desconocido"],
            "latitude": lat,
            "longitude": lng,
            "region": region,
            "commune": commune,
            "city": commune,
            "site_type": f"Concesion {concession_type_label}".strip(),
            "concession_type": concession_type_label,
            "concession_status": status_label or "-",
            "concession_role": rol,
            "concession_id": id_concession or "-",
            "concession_commune_code": commune_code or "-",
            "mining_company": holder or "-",
            "surface": "-",
            "altitude": "-",
            "production": "-",
            "workforce": "-",
            "average_salary": "-",
            "annual_revenue": "-",
            "future_hirings": "-",
            "operation_since": inscription_year or "-",
            "direct_workers": "-",
            "indirect_workers": "-",
            "hiring_plan_2026": "-",
            "data_origin": "sernageomin-catastro",
            "confidence_score": 0.99 if not is_available else 0.8,
            "enriched_at": now,
            "notes": note,
            "website": "#",
            "is_available_concession": bool(is_available),
            "environmental_reports": [],
            "operating_authorizations": [],
            "geology_studies": [],
            "mineral_life_studies": [],
            "mitigation_studies": [],
            "sources": [
                {
                    "name": "SERNAGEOMIN Catastro Minero",
                    "url": layer_url,
                    "note": note,
                }
            ],
        }
        if holder:
            append_field_provenance(
                item,
                field_name="mining_company",
                field_value=holder,
                source_type="official",
                source_url=layer_url,
                confidence_score=0.95,
                note=note,
                updated_at=now,
            )
        if inscription_year:
            append_field_provenance(
                item,
                field_name="operation_since",
                field_value=inscription_year,
                source_type="official",
                source_url=layer_url,
                confidence_score=0.9,
                note=note,
                updated_at=now,
            )
        append_field_provenance(
            item,
            field_name="is_available_concession",
            field_value="true" if is_available else "false",
            source_type="official",
            source_url=layer_url,
            confidence_score=0.95 if not is_available else 0.75,
            note=note,
            updated_at=now,
        )
        append_field_provenance(
            item,
            field_name="concession_type",
            field_value=concession_type_label,
            source_type="official",
            source_url=layer_url,
            confidence_score=0.99,
            note=note,
            updated_at=now,
        )
        append_field_provenance(
            item,
            field_name="concession_status",
            field_value=status_label or "-",
            source_type="official",
            source_url=layer_url,
            confidence_score=0.99,
            note=note,
            updated_at=now,
        )
        append_field_provenance(
            item,
            field_name="region",
            field_value=region,
            source_type="derived",
            source_url=layer_url,
            confidence_score=0.85,
            note="Region inferred from coordinates and region bounds.",
            updated_at=now,
        )
        next_id += 1
        items.append(item)

    if not items:
        raise ValueError("SERNAGEOMIN rows were read but 0 valid items remained")

    stats["sourceRecordsKept"] = len(items)
    dataset = {
        "meta": {
            "updatedAt": now,
            "lastVerifiedAt": now,
            "version": 1,
            "source": "sernageomin-catastro",
            "sources": [
                {
                    "name": "SERNAGEOMIN Catastro Minero Online",
                    "url": "https://appsngmaz.sernageomin.cl/catastro_SNGM/home/index",
                    "note": "Base oficial de propiedad minera (consulta pública).",
                },
                {
                    "name": "SERNAGEOMIN FeatureServer WGS84_Concesion",
                    "url": layer_url,
                    "note": "Capa oficial de concesiones con situación y tipo.",
                },
            ],
            "scrapeStats": stats,
            "qualityReport": {
                "dropThresholds": {
                    "chile_bounds": {
                        "lat_min": CHILE_LAT_MIN,
                        "lat_max": CHILE_LAT_MAX,
                        "lng_min": CHILE_LNG_MIN,
                        "lng_max": CHILE_LNG_MAX,
                    },
                    "commune_outlier_distance_km": COMMUNE_OUTLIER_DISTANCE_KM,
                    "commune_min_points_for_outlier_check": COMMUNE_MIN_POINTS_FOR_OUTLIER_CHECK,
                    "max_drop_samples_per_reason": MAX_DROP_SAMPLES_PER_REASON,
                },
                "dropCounts": {
                    "missing_coordinates": stats["sourceRecordsDroppedNoCoords"],
                    "outside_chile_bounds": stats["sourceRecordsDroppedOutOfChileBounds"],
                    "commune_outlier": stats["sourceRecordsDroppedCommuneOutlier"],
                },
                "dropSamples": drop_samples,
            },
        },
        "items": items,
    }
    return dataset, stats
