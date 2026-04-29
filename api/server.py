#!/usr/bin/env python3
"""FastAPI backend exposing dataset endpoints used by Next.js frontend."""

from __future__ import annotations

from pathlib import Path
import os
import sys
import time

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.storage import (
    get_concessions_page,
    get_dataset,
    get_link_report,
    get_mines_dataset,
    run_schema_migrations,
    utc_now_iso,
)

# Ensure schema is always migrated before serving requests.
run_schema_migrations()

app = FastAPI(title="minerales-chilenos-api", version="1.0.0")
_CONCESSIONS_CACHE: dict[str, object] = {"payload": None, "ts": 0.0}
_CONCESSIONS_CACHE_TTL_SECONDS = int(os.getenv("API_CONCESSIONS_CACHE_TTL_SECONDS", "120"))

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOW_ORIGINS",
        "http://localhost:8000,http://127.0.0.1:8000,https://mineraleschilenos.cl",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"ok": "true", "time": utc_now_iso()}


@app.get("/api/yacimientos")
def api_yacimientos() -> dict:
    return _get_cached_concessions_dataset()


@app.get("/api/concesiones")
def api_concesiones(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=0, ge=0, le=50000),
    min_lng: float | None = Query(default=None),
    min_lat: float | None = Query(default=None),
    max_lng: float | None = Query(default=None),
    max_lat: float | None = Query(default=None),
) -> dict:
    bbox_filter_on = None not in (min_lng, min_lat, max_lng, max_lat)
    if bbox_filter_on or limit > 0:
        page_limit = limit if limit > 0 else 50000
        return get_concessions_page(
            offset=offset,
            limit=page_limit,
            min_lng=min_lng,
            min_lat=min_lat,
            max_lng=max_lng,
            max_lat=max_lat,
        )

    return _get_cached_concessions_dataset()


@app.get("/api/minas")
def api_minas() -> dict:
    return get_mines_dataset()


@app.get("/api/link-report")
def api_link_report() -> dict:
    report = get_link_report()
    if report is None:
        return {"checked": 0, "ok_count": 0, "warning_count": 0, "failed_count": 0, "results": []}
    return report


@app.get("/{path:path}")
def not_found(path: str):
    return JSONResponse(status_code=404, content={"error": "Not Found", "path": f"/{path}"})


def _get_cached_concessions_dataset() -> dict:
    now = time.time()
    cached_payload = _CONCESSIONS_CACHE.get("payload")
    cached_ts = float(_CONCESSIONS_CACHE.get("ts") or 0.0)
    if cached_payload is not None and (now - cached_ts) <= _CONCESSIONS_CACHE_TTL_SECONDS:
        return cached_payload  # type: ignore[return-value]
    payload = get_dataset()
    _CONCESSIONS_CACHE["payload"] = payload
    _CONCESSIONS_CACHE["ts"] = now
    return payload
