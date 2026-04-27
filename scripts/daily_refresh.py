#!/usr/bin/env python3
"""Refresh dataset and persist it exclusively into PostgreSQL."""

from __future__ import annotations

import json
import os
import ssl
import urllib.request
import xml.etree.ElementTree as ET
from urllib.parse import urlencode

from storage import get_dataset, save_dataset, utc_now_iso


SERNAGEOMIN_MAPSERVER = "https://geoarcgis.sernageomin.cl/ArcGIS/rest/services/geoportal/Yacimiento/MapServer/0/query"
CKAN_PACKAGE_SEARCH = "https://datos.gob.cl/api/3/action/package_search"
MRDS_WFS_URL = "https://mrdata.usgs.gov/services/mrds"
MRDS_MAX_FEATURES = 800
BUILTIN_ARCGIS_SOURCES: list[tuple[str, str]] = [
    ("SERNAGEOMIN ArcGIS", SERNAGEOMIN_MAPSERVER),
    ("SERNAGEOMIN ArcGIS Legacy", "http://portalgeomin.sernageomin.cl:6080/arcgis/rest/services/geoportal/Yacimiento/MapServer/0/query"),
]


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
    return minerals or ["desconocido"]


def _dataset_from_features(features: list, source_name: str, source_url: str) -> dict:
    if not isinstance(features, list):
        raise ValueError(f"{source_name} response does not include a valid features array.")

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
        row_url = f"{source_url.rsplit('/query', 1)[0]}/{source_objid}" if source_objid is not None else source_url.rsplit("/query", 1)[0]

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
                "noticias": f"Dato obtenido por scraping de {source_name}.",
                "web": "#",
                "libre": False,
                "sources": [
                    {
                        "name": source_name,
                        "url": row_url,
                        "note": "Registro obtenido por scraping con fallback de fuentes.",
                    }
                ],
            }
        )
        next_id += 1

    if not items:
        raise ValueError(f"Scraping from {source_name} produced 0 valid records.")

    now = utc_now_iso()
    return {
        "meta": {
            "updatedAt": now,
            "version": 1,
            "source": source_name.lower().replace(" ", "-"),
            "sources": [
                {
                    "name": source_name,
                    "url": source_url.rsplit("/query", 1)[0],
                    "note": "Fuente utilizada para refresco automático.",
                }
            ],
        },
        "items": items,
    }


def scrape_mrds_chile_dataset() -> dict:
    xml_text = _request_text(
        MRDS_WFS_URL,
        {
            "service": "WFS",
            "version": "1.0.0",
            "request": "GetFeature",
            "typeName": "mrds-high",
            "maxFeatures": str(MRDS_MAX_FEATURES),
            "FILTER": "<Filter><PropertyIsEqualTo><PropertyName>fips_code</PropertyName><Literal>fCI</Literal></PropertyIsEqualTo></Filter>",
        },
    )
    root = ET.fromstring(xml_text)
    ns = {
        "gml": "http://www.opengis.net/gml",
        "ms": "http://mapserver.gis.umn.edu/mapserver",
    }

    items: list[dict] = []
    next_id = 1
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
        code_list = (feature.findtext("ms:code_list", default="", namespaces=ns) or "").strip()
        source_url = (feature.findtext("ms:url", default="", namespaces=ns) or "").strip()
        coord_text = feature.findtext(".//gml:coordinates", default="", namespaces=ns) or ""
        lat, lng = _parse_mrds_coordinates(coord_text)

        if not site_name or lat is None or lng is None:
            continue

        items.append(
            {
                "id": next_id,
                "nombre": site_name,
                "mineral": _decode_mrds_minerals(code_list),
                "lat": lat,
                "lng": lng,
                "region": "Chile",
                "tipo": dev_stat or "Yacimiento",
                "empresa": "-",
                "sup": "-",
                "alt": "-",
                "prod": "-",
                "dotacion": "-",
                "sueldos_promedio": "-",
                "ingresos": "-",
                "contrataciones_futuras": "-",
                "noticias": "Dato obtenido por scraping de USGS MRDS (Chile).",
                "web": "#",
                "libre": False,
                "sources": [
                    {
                        "name": "USGS MRDS",
                        "url": source_url or "https://mrdata.usgs.gov/mrds/",
                        "note": f"dep_id={dep_id}" if dep_id else "Fuente WFS MRDS",
                    }
                ],
            }
        )
        next_id += 1

    if not items:
        raise ValueError("USGS MRDS scraping produced 0 valid Chile records.")

    now = utc_now_iso()
    return {
        "meta": {
            "updatedAt": now,
            "version": 1,
            "source": "usgs-mrds",
            "sources": [
                {
                    "name": "USGS MRDS WFS",
                    "url": "https://mrdata.usgs.gov/services/mrds",
                    "note": "Filtro por Chile usando fips_code=fCI.",
                }
            ],
        },
        "items": items,
    }


def _scrape_arcgis_query(source_url: str, source_name: str) -> dict:
    payload = _request_json(
        source_url,
        {
            "where": "1=1",
            "outFields": "*",
            "returnGeometry": "true",
            "outSR": "4326",
            "f": "json",
        },
    )
    return _dataset_from_features(payload.get("features"), source_name, source_url)


def _discover_ckan_arcgis_urls() -> list[str]:
    payload = _request_json(
        CKAN_PACKAGE_SEARCH,
        {
            "fq": "organization:servicio_nacional_de_geologia_y_mineria",
            "q": "yacimientos",
            "rows": "20",
        },
    )
    result = payload.get("result")
    if not isinstance(result, dict):
        return []
    packages = result.get("results")
    if not isinstance(packages, list):
        return []

    discovered: list[str] = []
    for pkg in packages:
        if not isinstance(pkg, dict):
            continue
        resources = pkg.get("resources")
        if not isinstance(resources, list):
            continue
        for resource in resources:
            if not isinstance(resource, dict):
                continue
            url = resource.get("url")
            if not isinstance(url, str) or "MapServer" not in url:
                continue
            base = url.rstrip("/")
            if base.endswith("/0"):
                discovered.append(f"{base}/query")
            elif base.endswith("/MapServer"):
                discovered.append(f"{base}/0/query")
    unique: list[str] = []
    seen = set()
    for url in discovered:
        if url not in seen:
            seen.add(url)
            unique.append(url)
    return unique


def scrape_dataset_with_fallback() -> tuple[dict, str]:
    try:
        dataset = scrape_mrds_chile_dataset()
        return dataset, "USGS MRDS WFS"
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"USGS MRDS WFS scraping failed ({MRDS_WFS_URL}): {exc}") from exc


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
        scraped, source_name = scrape_dataset_with_fallback()
        current = scraped
        current.setdefault("meta", {})
        current["meta"]["scrapeSourceName"] = source_name
        source_mode = "scrape-fallback"

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
