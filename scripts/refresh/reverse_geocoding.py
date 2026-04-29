from __future__ import annotations

import json
import os
import ssl
import time
import urllib.request
from urllib.parse import urlencode

from storage import (
    append_field_provenance,
    get_reverse_geocode_cache,
    upsert_reverse_geocode_cache,
    utc_now_iso,
)


NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"
DEFAULT_REVERSE_GEOCODE_MAX_LOOKUPS = 40
DEFAULT_REVERSE_GEOCODE_DELAY_SECONDS = 1.0


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

        region_candidate = str(fields.get("province") or fields.get("commune") or fields.get("city") or "").strip()
        if region_candidate and str(target.get("region") or "").strip().lower() in {"", "chile"}:
            target["region"] = region_candidate
            append_field_provenance(
                target,
                field_name="region",
                field_value=region_candidate,
                source_type="inferred",
                source_url=source_url,
                confidence_score=0.6 if from_cache else 0.65,
                note="derived from reverse geocoding hierarchy",
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
