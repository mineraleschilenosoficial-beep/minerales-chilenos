#!/usr/bin/env python3
"""Validate data/yacimientos.json with strict schema and freshness checks."""

from __future__ import annotations

import datetime as dt
import json
import re
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "data" / "yacimientos.json"


def is_http_url(value: str) -> bool:
    try:
        parsed = urlparse(value)
        return parsed.scheme in {"http", "https"} and bool(parsed.netloc)
    except Exception:  # noqa: BLE001
        return False


def is_specific_url(value: str) -> bool:
    """Reject generic homepage-like URLs."""
    try:
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            return False
        path = (parsed.path or "").strip()
        # "/" or empty path is considered generic.
        if path in {"", "/"}:
            return False
        # If path is very short and no query/fragment, still likely generic.
        if len(path.strip("/")) < 3 and not parsed.query and not parsed.fragment:
            return False
        return True
    except Exception:  # noqa: BLE001
        return False


def parse_iso(value: str) -> dt.datetime | None:
    try:
        # Accept trailing Z
        value = value.replace("Z", "+00:00")
        return dt.datetime.fromisoformat(value)
    except Exception:  # noqa: BLE001
        return None


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []

    if not DATA_FILE.exists():
        print("ERROR: data/yacimientos.json not found")
        return 1

    payload = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    meta = payload.get("meta")
    items = payload.get("items")

    if not isinstance(meta, dict):
        errors.append("meta must be an object")
    if not isinstance(items, list):
        errors.append("items must be an array")
        items = []

    if isinstance(meta, dict):
        for key in ("updatedAt", "version", "source"):
            if key not in meta:
                errors.append(f"meta.{key} is required")
        if "updatedAt" in meta:
            dt_value = parse_iso(str(meta["updatedAt"]))
            if dt_value is None:
                errors.append("meta.updatedAt must be ISO datetime")
            else:
                now = dt.datetime.now(dt.timezone.utc)
                age_days = (now - dt_value.astimezone(dt.timezone.utc)).days
                if age_days > 45:
                    warnings.append(f"meta.updatedAt seems old ({age_days} days)")

    seen_ids: set[int] = set()
    seen_names: set[str] = set()
    required_fields = ("id", "nombre", "mineral", "lat", "lng", "region", "tipo", "libre")

    for idx, item in enumerate(items):
        path = f"items[{idx}]"
        if not isinstance(item, dict):
            errors.append(f"{path} must be object")
            continue

        for field in required_fields:
            if field not in item:
                errors.append(f"{path}.{field} is required")

        item_id = item.get("id")
        if not isinstance(item_id, int):
            errors.append(f"{path}.id must be integer")
        elif item_id in seen_ids:
            errors.append(f"{path}.id duplicate value: {item_id}")
        else:
            seen_ids.add(item_id)

        name = item.get("nombre")
        if not isinstance(name, str) or not name.strip():
            errors.append(f"{path}.nombre must be non-empty string")
        elif name.lower() in seen_names:
            warnings.append(f"{path}.nombre duplicated by text: {name}")
        else:
            seen_names.add(name.lower())

        mineral = item.get("mineral")
        if not isinstance(mineral, list) or not mineral:
            errors.append(f"{path}.mineral must be non-empty array")
        elif not all(isinstance(x, str) and x.strip() for x in mineral):
            errors.append(f"{path}.mineral elements must be non-empty strings")

        lat = item.get("lat")
        lng = item.get("lng")
        if not isinstance(lat, (int, float)) or not (-90 <= float(lat) <= 90):
            errors.append(f"{path}.lat must be number between -90 and 90")
        if not isinstance(lng, (int, float)) or not (-180 <= float(lng) <= 180):
            errors.append(f"{path}.lng must be number between -180 and 180")

        if not isinstance(item.get("region"), str) or not item["region"].strip():
            errors.append(f"{path}.region must be non-empty string")
        if not isinstance(item.get("tipo"), str) or not item["tipo"].strip():
            errors.append(f"{path}.tipo must be non-empty string")
        if not isinstance(item.get("libre"), bool):
            errors.append(f"{path}.libre must be boolean")

        web = item.get("web")
        if web is not None and web != "#":
            if not isinstance(web, str) or not is_http_url(web):
                errors.append(f"{path}.web must be http/https URL or '#'")

        docs = item.get("docs")
        if docs is not None:
            if not isinstance(docs, list):
                errors.append(f"{path}.docs must be array")
            else:
                for d_idx, doc in enumerate(docs):
                    dpath = f"{path}.docs[{d_idx}]"
                    if not isinstance(doc, dict):
                        errors.append(f"{dpath} must be object")
                        continue
                    if not isinstance(doc.get("n"), str) or not doc["n"].strip():
                        errors.append(f"{dpath}.n must be non-empty string")
                    url = doc.get("url")
                    if not isinstance(url, str) or not is_http_url(url):
                        errors.append(f"{dpath}.url must be valid http/https URL")
                    elif not is_specific_url(url):
                        errors.append(f"{dpath}.url must be specific (not homepage/root)")
                    if not isinstance(doc.get("tipo"), str) or not doc["tipo"].strip():
                        errors.append(f"{dpath}.tipo must be non-empty string")

    if isinstance(meta, dict):
        sources = meta.get("sources")
        if sources is not None:
            if not isinstance(sources, list) or not sources:
                errors.append("meta.sources must be a non-empty array when present")
            else:
                for s_idx, src in enumerate(sources):
                    spath = f"meta.sources[{s_idx}]"
                    if not isinstance(src, dict):
                        errors.append(f"{spath} must be object")
                        continue
                    name = src.get("name")
                    url = src.get("url")
                    note = src.get("note")
                    if not isinstance(name, str) or not name.strip():
                        errors.append(f"{spath}.name must be non-empty string")
                    if not isinstance(url, str) or not is_http_url(url):
                        errors.append(f"{spath}.url must be valid http/https URL")
                    elif not is_specific_url(url):
                        errors.append(f"{spath}.url must be specific (not homepage/root)")
                    if note is not None and (not isinstance(note, str) or not note.strip()):
                        errors.append(f"{spath}.note must be non-empty string when present")

    if warnings:
        print("Warnings:")
        for warning in warnings:
            print(f"- {warning}")

    if errors:
        print("Errors:")
        for err in errors:
            print(f"- {err}")
        print(f"\nValidation failed with {len(errors)} error(s).")
        return 1

    print(f"Validation OK. Items: {len(items)}. Warnings: {len(warnings)}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
