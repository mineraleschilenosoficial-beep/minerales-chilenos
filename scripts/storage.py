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
        return db_payload
    raise RuntimeError("Dataset not found in PostgreSQL. Run daily refresh to bootstrap data.")


def save_dataset(payload: dict[str, Any]) -> None:
    upsert_state_to_db("dataset", payload)


def get_link_report() -> dict[str, Any] | None:
    return get_state_from_db("link_report")


def save_link_report(payload: dict[str, Any]) -> None:
    upsert_state_to_db("link_report", payload)
