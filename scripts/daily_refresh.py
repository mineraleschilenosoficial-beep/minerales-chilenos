#!/usr/bin/env python3
"""Refresh dataset and persist it into PostgreSQL (and local fallback file)."""

from __future__ import annotations

import json
import os
import ssl
import urllib.request
from storage import get_dataset, save_dataset, utc_now_iso


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


def main() -> int:
    current = get_dataset()
    current.setdefault("meta", {})

    source_url = os.getenv("DATA_JSON_SOURCE_URL", "").strip()
    source_mode = "local-only"

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

    current["meta"]["lastVerifiedAt"] = utc_now_iso()
    current["meta"]["refreshMode"] = source_mode

    save_dataset(current)
    print(f"daily refresh complete mode={source_mode}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
