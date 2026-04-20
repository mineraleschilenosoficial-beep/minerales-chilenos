#!/usr/bin/env python3
"""Daily data refresh entrypoint for GitHub Actions (frontend-only)."""

from __future__ import annotations

import datetime as dt
import json
import os
import ssl
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "data" / "yacimientos.json"


def utc_now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


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
    current = json.loads(DATA_FILE.read_text(encoding="utf-8"))
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

    DATA_FILE.write_text(json.dumps(current, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"daily refresh complete mode={source_mode}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
