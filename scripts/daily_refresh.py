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


MRDS_WFS_URL = "https://mrdata.usgs.gov/services/mrds"
MRDS_MAX_FEATURES = 800


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
    return minerals or ["desconocido"]


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
