#!/usr/bin/env python3
"""Shared PostgreSQL helpers for dataset and link report storage."""

from __future__ import annotations

import datetime as dt
import os
from typing import Any

try:
    import psycopg
    from psycopg.rows import dict_row
    from psycopg.types.json import Jsonb
except ModuleNotFoundError:  # pragma: no cover - handled at runtime
    psycopg = None
    dict_row = None
    Jsonb = None

def utc_now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def get_database_url() -> str:
    return os.getenv("DATABASE_URL", "").strip()


def has_database_config() -> bool:
    return bool(get_database_url())


def _required_database_url() -> str:
    dsn = get_database_url()
    if not dsn:
        raise RuntimeError("DATABASE_URL is required. Local JSON storage is disabled.")
    return dsn


def ensure_schema(conn: psycopg.Connection[Any]) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS app_state (
              key TEXT PRIMARY KEY,
              value JSONB NOT NULL,
              updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )


def _coalesce(item: dict[str, Any], keys: tuple[str, ...], default: Any = None) -> Any:
    for key in keys:
        if key in item:
            return item[key]
    return default


def _normalize_item_schema(raw_item: dict[str, Any]) -> dict[str, Any]:
    # Canonical DB/API fields in English only.
    legacy_keys = {
        "nombre", "mineral", "lat", "lng", "tipo", "empresa", "sup", "alt", "prod",
        "dotacion", "sueldos_promedio", "ingresos", "contrataciones_futuras", "noticias",
        "web", "libre", "ciudad", "comuna", "provincia", "localidad", "ubicacion", "faena",
        "direccion"
    }
    if "name" not in raw_item and legacy_keys.intersection(raw_item.keys()):
        raise ValueError("Legacy Spanish schema detected. Run daily refresh to migrate dataset to English schema.")

    canonical = {
        "id": _coalesce(raw_item, ("id",)),
        "name": _coalesce(raw_item, ("name",), ""),
        "minerals": _coalesce(raw_item, ("minerals",), []),
        "latitude": _coalesce(raw_item, ("latitude",)),
        "longitude": _coalesce(raw_item, ("longitude",)),
        "region": _coalesce(raw_item, ("region",), ""),
        "site_type": _coalesce(raw_item, ("site_type",), ""),
        "mining_company": _coalesce(raw_item, ("mining_company",), "-"),
        "surface": _coalesce(raw_item, ("surface",), "-"),
        "altitude": _coalesce(raw_item, ("altitude",), "-"),
        "production": _coalesce(raw_item, ("production",), "-"),
        "workforce": _coalesce(raw_item, ("workforce",), "-"),
        "average_salary": _coalesce(raw_item, ("average_salary",), "-"),
        "annual_revenue": _coalesce(raw_item, ("annual_revenue",), "-"),
        "future_hirings": _coalesce(raw_item, ("future_hirings",), "-"),
        "notes": _coalesce(raw_item, ("notes",), ""),
        "website": _coalesce(raw_item, ("website",), "#"),
        "is_available_concession": _coalesce(raw_item, ("is_available_concession",), False),
        "sources": _coalesce(raw_item, ("sources",), []),
        "docs": _coalesce(raw_item, ("docs",), []),
        "city": _coalesce(raw_item, ("city",), ""),
        "commune": _coalesce(raw_item, ("commune",), ""),
        "province": _coalesce(raw_item, ("province",), ""),
        "locality": _coalesce(raw_item, ("locality",), ""),
        "location": _coalesce(raw_item, ("location",), ""),
        "operation_site": _coalesce(raw_item, ("operation_site",), ""),
        "address": _coalesce(raw_item, ("address",), ""),
    }
    result = {**raw_item, **canonical}
    for key in legacy_keys:
        result.pop(key, None)
    return result


def normalize_dataset_schema(payload: dict[str, Any]) -> dict[str, Any]:
    items = payload.get("items")
    if not isinstance(items, list):
        return payload

    normalized_items: list[dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            normalized_items.append(item)
            continue
        normalized_items.append(_normalize_item_schema(item))

    result = dict(payload)
    result["items"] = normalized_items
    result.setdefault("meta", {})
    return result


def get_state_from_db(key: str) -> dict[str, Any] | None:
    dsn = _required_database_url()
    if psycopg is None or dict_row is None:
        raise RuntimeError("psycopg is required when DATABASE_URL is set")
    with psycopg.connect(dsn, row_factory=dict_row) as conn:
        ensure_schema(conn)
        with conn.cursor() as cur:
            cur.execute("SELECT value FROM app_state WHERE key = %s", (key,))
            row = cur.fetchone()
            if not row:
                return None
            value = row.get("value")
            return value if isinstance(value, dict) else None


def upsert_state_to_db(key: str, payload: dict[str, Any]) -> None:
    dsn = _required_database_url()
    if psycopg is None or Jsonb is None:
        raise RuntimeError("psycopg is required when DATABASE_URL is set")
    with psycopg.connect(dsn) as conn:
        ensure_schema(conn)
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO app_state (key, value, updated_at)
                VALUES (%s, %s, NOW())
                ON CONFLICT (key)
                DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
                """,
                (key, Jsonb(payload)),
            )
        conn.commit()


def get_dataset() -> dict[str, Any]:
    db_payload = get_state_from_db("dataset")
    if db_payload and isinstance(db_payload.get("items"), list):
        db_payload.setdefault("meta", {})
        return normalize_dataset_schema(db_payload)
    raise RuntimeError("Dataset not found in PostgreSQL. Run daily refresh to bootstrap data.")


def save_dataset(payload: dict[str, Any]) -> None:
    upsert_state_to_db("dataset", normalize_dataset_schema(payload))


def get_link_report() -> dict[str, Any] | None:
    return get_state_from_db("link_report")


def save_link_report(payload: dict[str, Any]) -> None:
    upsert_state_to_db("link_report", payload)
