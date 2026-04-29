#!/usr/bin/env python3
"""Concession evidence and business-rule logic for refresh pipeline."""

from __future__ import annotations

import json
import os
import ssl
import urllib.request
from urllib.parse import urlencode, urlparse

from .refresh_helpers import env_enabled, is_present, parse_bool_text
from storage import append_field_provenance, utc_now_iso


AUTHORIZATION_KEYWORDS = ("autoriz", "authoriz", "permit", "licenc", "resolucion", "resolution", "rca")
DEFAULT_TRUSTED_CONCESSION_SOURCE_HOSTS = (
    ".gob.cl",
    ".gov.cl",
    "sernageomin.cl",
    "catastro.sernageomin.cl",
    "sea.gob.cl",
    "mineria.cl",
)
DEFAULT_SERNAGEOMIN_CONCESSION_LAYER_URL = (
    "https://services1.arcgis.com/OyjvVdFTl5hfSdX3/ArcGIS/rest/services/Marcelo_Layer/FeatureServer/2"
)
CONCESSION_SPECIFIC_KEYWORDS = (
    "concesion",
    "concesión",
    "titulo minero",
    "título minero",
    "pertenencia minera",
    "catastro minero",
    "rol minero",
    "codigo de concesion",
    "código de concesión",
    "mining concession",
    "mining title",
)


def _trusted_concession_hosts() -> tuple[str, ...]:
    raw = str(os.getenv("TRUSTED_CONCESSION_SOURCE_HOSTS", "")).strip()
    if not raw:
        return DEFAULT_TRUSTED_CONCESSION_SOURCE_HOSTS
    hosts = tuple(token.strip().lower() for token in raw.split(",") if token.strip())
    return hosts or DEFAULT_TRUSTED_CONCESSION_SOURCE_HOSTS


def _is_trusted_concession_url(url: str) -> bool:
    clean = str(url or "").strip()
    if not (clean.startswith("http://") or clean.startswith("https://")):
        return False
    try:
        host = (urlparse(clean).netloc or "").strip().lower()
    except Exception:  # noqa: BLE001
        return False
    if not host:
        return False
    for token in _trusted_concession_hosts():
        token = token.strip().lower()
        if not token:
            continue
        if token.startswith("."):
            if host.endswith(token):
                return True
            continue
        if host == token or host.endswith(f".{token}"):
            return True
    return False


def _is_concession_specific_evidence(url: str, *texts: str) -> bool:
    haystack = " ".join([str(url or "").strip().lower(), *(str(t or "").strip().lower() for t in texts)])
    if not haystack:
        return False
    return any(token in haystack for token in CONCESSION_SPECIFIC_KEYWORDS)


def _is_reliable_authorization_entry(entry) -> bool:
    if isinstance(entry, str):
        url = entry.strip()
        return _is_trusted_concession_url(url)
    if not isinstance(entry, dict):
        return False
    url = str(entry.get("url") or "").strip()
    if not _is_trusted_concession_url(url):
        return False
    doc_type = str(entry.get("doc_type") or "").strip().lower()
    name = str(entry.get("name") or "").strip().lower()
    note = str(entry.get("note") or "").strip().lower()
    if doc_type in {"registry", "fallback"}:
        return False
    if "fallback" in name or "fallback" in note:
        return False
    if not _is_concession_specific_evidence(url, doc_type, name, note):
        return False
    if not any(token in f"{name} {note} {doc_type}" for token in AUTHORIZATION_KEYWORDS):
        return False
    return True


def _find_reliable_concession_from_provenance(item: dict) -> tuple[bool | None, bool, str]:
    provenance = item.get("field_provenance")
    if not isinstance(provenance, list):
        return None, False, ""
    for row in reversed(provenance):
        if not isinstance(row, dict):
            continue
        if str(row.get("field_name") or "").strip() != "is_available_concession":
            continue
        source_type = str(row.get("source_type") or "").strip().lower()
        if source_type not in {"manual", "official"}:
            continue
        source_url = str(row.get("source_url") or "").strip()
        if not _is_trusted_concession_url(source_url):
            continue
        source_note = str(row.get("note") or "").strip()
        if not _is_concession_specific_evidence(source_url, source_note):
            continue
        parsed = parse_bool_text(str(row.get("field_value") or ""))
        if parsed is None:
            continue
        return parsed, True, source_url
    return None, False, ""


def _first_reliable_authorization_url(authorizations: list) -> str:
    for entry in authorizations:
        if not _is_reliable_authorization_entry(entry):
            continue
        if isinstance(entry, dict):
            url = str(entry.get("url") or "").strip()
            if url:
                return url
        elif isinstance(entry, str):
            url = entry.strip()
            if url:
                return url
    return ""


def _query_sernageomin_concession_by_point(
    lon: float,
    lat: float,
    layer_url: str,
    timeout_seconds: float,
) -> dict | None:
    query_url = layer_url.rstrip("/") + "/query"
    params = {
        "f": "json",
        "where": "1=1",
        "geometry": f"{lon},{lat}",
        "geometryType": "esriGeometryPoint",
        "inSR": "4326",
        "spatialRel": "esriSpatialRelIntersects",
        "outFields": (
            "NUMERO_ROL,DV_ROL,NOMBRE,HECTAREAS,FECHA_VENCIMIENTO,"
            "SITUACION_CONCESION,TIPO_CONCESION,COMUNA"
        ),
        "returnGeometry": "false",
        "resultRecordCount": "1",
    }
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    request_url = f"{query_url}?{urlencode(params)}"
    with urllib.request.urlopen(request_url, timeout=timeout_seconds, context=context) as response:
        raw = response.read().decode("utf-8", "ignore")
    payload = json.loads(raw)
    features = payload.get("features")
    if not isinstance(features, list) or not features:
        return None
    attrs = features[0].get("attributes")
    return attrs if isinstance(attrs, dict) else None


def enrich_concession_evidence_from_sernageomin(payload: dict) -> tuple[dict, dict[str, int]]:
    stats = {
        "concessionEvidenceQueries": 0,
        "concessionEvidenceMatches": 0,
        "concessionEvidenceWrites": 0,
        "concessionEvidenceErrors": 0,
    }
    enabled = env_enabled("SERNAGEOMIN_CONCESSION_LOOKUP", "true")
    if not enabled:
        return payload, stats
    layer_url = str(
        os.getenv("SERNAGEOMIN_CONCESSION_LAYER_URL", DEFAULT_SERNAGEOMIN_CONCESSION_LAYER_URL)
    ).strip()
    if not layer_url:
        return payload, stats
    timeout_seconds = float(os.getenv("SERNAGEOMIN_CONCESSION_TIMEOUT_SECONDS", "8") or "8")
    cache: dict[tuple[float, float], dict | None] = {}
    now = utc_now_iso()
    for item in payload.get("items") or []:
        if not isinstance(item, dict):
            continue
        lat = item.get("latitude")
        lon = item.get("longitude")
        if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
            continue
        key = (round(float(lon), 6), round(float(lat), 6))
        if key not in cache:
            try:
                stats["concessionEvidenceQueries"] += 1
                cache[key] = _query_sernageomin_concession_by_point(
                    lon=float(lon),
                    lat=float(lat),
                    layer_url=layer_url,
                    timeout_seconds=timeout_seconds,
                )
            except Exception:  # noqa: BLE001
                stats["concessionEvidenceErrors"] += 1
                cache[key] = None
        attrs = cache[key]
        if not attrs:
            continue
        stats["concessionEvidenceMatches"] += 1
        role_number = str(attrs.get("NUMERO_ROL") or "").strip()
        role_dv = str(attrs.get("DV_ROL") or "").strip()
        status = str(attrs.get("SITUACION_CONCESION") or "").strip()
        concession_type = str(attrs.get("TIPO_CONCESION") or "").strip()
        commune = str(attrs.get("COMUNA") or "").strip()
        role_display = f"{role_number}-{role_dv}" if role_number and role_dv else role_number or "sin rol"
        note = (
            "Catastro SERNAGEOMIN concesion; "
            f"rol={role_display}; situacion={status or 'sin dato'}; "
            f"tipo={concession_type or 'sin dato'}; comuna={commune or 'sin dato'}"
        )
        item["is_available_concession"] = False
        append_field_provenance(
            item,
            field_name="is_available_concession",
            field_value="false",
            source_type="official",
            source_url=layer_url,
            confidence_score=0.98,
            note=note,
            updated_at=now,
        )
        stats["concessionEvidenceWrites"] += 1
    return payload, stats


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
        if is_present(item.get("city")):
            city_count += 1
        if is_present(item.get("mining_company")):
            mining_company_count += 1

        reliable_decision, reliable, reliable_source_url = _find_reliable_concession_from_provenance(item)
        authorizations = item.get("operating_authorizations")
        if reliable_decision is None:
            has_reliable_authorizations = isinstance(authorizations, list) and any(
                _is_reliable_authorization_entry(entry) for entry in authorizations
            )
            if has_reliable_authorizations:
                reliable_decision = True
                reliable = True
                reliable_source_url = _first_reliable_authorization_url(authorizations)
                append_field_provenance(
                    item,
                    field_name="is_available_concession",
                    field_value="true",
                    source_type="official",
                    source_url=reliable_source_url,
                    confidence_score=0.9,
                    note="derived from trusted authorization source",
                    updated_at=now,
                )

        item["is_available_concession"] = bool(reliable_decision) if reliable_decision is not None else False
        if item["is_available_concession"] is True:
            true_count += 1
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
