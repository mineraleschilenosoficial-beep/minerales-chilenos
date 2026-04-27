#!/usr/bin/env python3
"""Refresh dataset and persist it exclusively into PostgreSQL."""

from __future__ import annotations

import json
import os
import ssl
import urllib.request
from storage import get_dataset, save_dataset, utc_now_iso


def build_seed_dataset() -> dict:
    now = utc_now_iso()
    return {
        "meta": {
            "updatedAt": now,
            "version": 1,
            "source": "seed-script",
        },
        "items": [
            {
                "id": 9001,
                "nombre": "Punto semilla - Antofagasta",
                "mineral": ["cobre"],
                "lat": -23.65,
                "lng": -70.4,
                "region": "Antofagasta",
                "tipo": "Referencia",
                "empresa": "MineralesChilenos.cl",
                "sup": "-",
                "alt": "-",
                "prod": "-",
                "dotacion": "-",
                "sueldos_promedio": "-",
                "ingresos": "-",
                "contrataciones_futuras": "-",
                "noticias": "Dato inicial generado automaticamente por seed script.",
                "web": "#",
                "libre": False,
                "sources": [
                    {
                        "name": "Seed inicial del sistema",
                        "url": "https://www.mineraleschilenos.cl/seed/bootstrap-script",
                        "note": "Registro base para iniciar PostgreSQL sin fuente externa.",
                    }
                ],
            }
        ],
    }


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
        current = build_seed_dataset()
        source_mode = "db-bootstrap-script"

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
