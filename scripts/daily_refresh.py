#!/usr/bin/env python3
"""Refresh dataset and persist it exclusively into PostgreSQL."""

from __future__ import annotations

import json
import os
import ssl
import urllib.request
from urllib.parse import urlencode

from storage import get_dataset, save_dataset, utc_now_iso


SERNAGEOMIN_MAPSERVER = "https://geoarcgis.sernageomin.cl/ArcGIS/rest/services/geoportal/Yacimiento/MapServer/0/query"


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


def _request_json(url: str, params: dict[str, str]) -> dict:
    query = urlencode(params)
    request = urllib.request.Request(
        f"{url}?{query}",
        method="GET",
        headers={"User-Agent": "Mozilla/5.0 (DailyRefresh)"},
    )
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(request, timeout=45, context=ctx) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("Expected JSON object response from scraper source.")
    return payload


def _pick_str(attrs: dict, candidates: list[str], fallback: str = "-") -> str:
    for key in candidates:
        value = attrs.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return fallback


def _to_float(value) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.replace(",", "."))
        except ValueError:
            return None
    return None


def _extract_coords(attrs: dict, geom: dict | None) -> tuple[float | None, float | None]:
    if isinstance(geom, dict):
        x = _to_float(geom.get("x"))
        y = _to_float(geom.get("y"))
        if x is not None and y is not None:
            return y, x
    lat = _to_float(attrs.get("LATITUD") or attrs.get("LAT") or attrs.get("Y"))
    lng = _to_float(attrs.get("LONGITUD") or attrs.get("LON") or attrs.get("LNG") or attrs.get("X"))
    return lat, lng


def scrape_sernageomin_dataset() -> dict:
    payload = _request_json(
        SERNAGEOMIN_MAPSERVER,
        {
            "where": "1=1",
            "outFields": "*",
            "returnGeometry": "true",
            "outSR": "4326",
            "f": "json",
        },
    )
    features = payload.get("features")
    if not isinstance(features, list):
        raise ValueError("SERNAGEOMIN response does not include a valid features array.")

    items: list[dict] = []
    next_id = 1
    for feature in features:
        if not isinstance(feature, dict):
            continue
        attrs = feature.get("attributes")
        if not isinstance(attrs, dict):
            continue
        geom = feature.get("geometry") if isinstance(feature.get("geometry"), dict) else None
        lat, lng = _extract_coords(attrs, geom)
        if lat is None or lng is None:
            continue

        nombre = _pick_str(attrs, ["NOMBRE", "NOM_YAC", "YACIMIENTO", "NAME"], fallback="")
        if not nombre:
            continue

        mineral_txt = _pick_str(attrs, ["MINERAL", "SUSTANCIA", "MINERAL_1", "TIPO_MIN"], fallback="desconocido")
        mineral_values = [chunk.strip().lower() for chunk in mineral_txt.replace(";", ",").split(",") if chunk.strip()]
        if not mineral_values:
            mineral_values = ["desconocido"]

        region = _pick_str(attrs, ["REGION", "REGIÓN"], fallback="Sin region")
        tipo = _pick_str(attrs, ["TIPO", "TIPO_YAC", "CLASE"], fallback="Yacimiento")

        source_objid = attrs.get("OBJECTID")
        source_url = f"https://geoarcgis.sernageomin.cl/ArcGIS/rest/services/geoportal/Yacimiento/MapServer/0/{source_objid}" if source_objid is not None else "https://geoarcgis.sernageomin.cl/ArcGIS/rest/services/geoportal/Yacimiento/MapServer/0"

        items.append(
            {
                "id": next_id,
                "nombre": nombre,
                "mineral": mineral_values,
                "lat": lat,
                "lng": lng,
                "region": region,
                "tipo": tipo,
                "empresa": _pick_str(attrs, ["EMPRESA", "TITULAR"], fallback="-"),
                "sup": _pick_str(attrs, ["SUPERFICIE", "SUP"], fallback="-"),
                "alt": _pick_str(attrs, ["ALTITUD", "ALT"], fallback="-"),
                "prod": _pick_str(attrs, ["PRODUCCION", "PROD"], fallback="-"),
                "dotacion": "-",
                "sueldos_promedio": "-",
                "ingresos": "-",
                "contrataciones_futuras": "-",
                "noticias": "Dato obtenido por scraping de servicio oficial SERNAGEOMIN.",
                "web": "#",
                "libre": False,
                "sources": [
                    {
                        "name": "SERNAGEOMIN - Servicio de Yacimientos",
                        "url": source_url,
                        "note": "Scraping desde servicio ArcGIS publicado en datos.gob.cl",
                    }
                ],
            }
        )
        next_id += 1

    if not items:
        raise ValueError("Scraping completed but produced 0 valid records.")

    now = utc_now_iso()
    return {
        "meta": {
            "updatedAt": now,
            "version": 1,
            "source": "sernageomin-scrape",
            "sources": [
                {
                    "name": "SERNAGEOMIN - Yacimientos",
                    "url": "https://geoarcgis.sernageomin.cl/ArcGIS/rest/services/geoportal/Yacimiento/MapServer",
                    "note": "Servicio oficial publicado en datos.gob.cl",
                }
            ],
        },
        "items": items,
    }


def main() -> int:
    source_url = os.getenv("DATA_JSON_SOURCE_URL", "").strip()
    source_mode = "db-only"

    try:
        current = get_dataset()
    except Exception:  # noqa: BLE001
        current = {"meta": {}, "items": []}
    current.setdefault("meta", {})
    if not isinstance(current.get("items"), list):
        current["items"] = []

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
            current["meta"]["lastRemoteError"] = str(exc)
            source_mode = "remote-json-error"

    if not source_url and not current["items"]:
        scraped = scrape_sernageomin_dataset()
        current = scraped
        source_mode = "sernageomin-scrape"

    current["meta"].setdefault("version", 1)
    current["meta"].setdefault("source", "postgresql")
    current["meta"]["updatedAt"] = utc_now_iso()
    current["meta"]["lastVerifiedAt"] = utc_now_iso()
    current["meta"]["refreshMode"] = source_mode

    save_dataset(current)
    print(f"daily refresh complete mode={source_mode}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
