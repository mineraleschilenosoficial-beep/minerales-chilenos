#!/usr/bin/env python3
"""FastAPI backend exposing dataset endpoints used by Next.js frontend."""

from __future__ import annotations

from pathlib import Path
import os
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from graphql import GraphQLResolveInfo, build_schema, graphql_sync

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.storage import (
    get_concession_detail,
    get_concessions_filter_index,
    get_concessions_map_dataset,
    get_link_report,
    get_mines_dataset,
    run_schema_migrations,
    utc_now_iso,
)

# Ensure schema is always migrated before serving requests.
run_schema_migrations()

app = FastAPI(title="minerales-chilenos-api", version="1.0.0")

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
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)
app.add_middleware(
    GZipMiddleware,
    minimum_size=max(500, int(os.getenv("API_GZIP_MIN_SIZE", "1024"))),
)


class GraphQLPayload(BaseModel):
    query: str
    variables: dict | None = None
    operationName: str | None = None


_GRAPHQL_SCHEMA = build_schema(
    """
    scalar JSON

    type ConcessionsDataset {
      meta: JSON
      items: JSON
    }

    type ConcessionsFilterIndex {
      regions: [String!]!
      communes: [String!]!
      companies: [String!]!
      tipos: [String!]!
    }

    type Query {
      concessionsMapCore: ConcessionsDataset!
      concessionsMap: ConcessionsDataset!
      concessionsFilterIndex: ConcessionsFilterIndex!
      concession(id: Int!): JSON
    }
    """
)


def _resolve_concessions_map(_obj: object, _info: GraphQLResolveInfo) -> dict:
    # No cache: always fetch latest minimal dataset for map usage.
    return get_concessions_map_dataset()


def _resolve_concessions_filter_index(_obj: object, _info: GraphQLResolveInfo) -> dict:
    return get_concessions_filter_index()


def _resolve_concession(_obj: object, _info: GraphQLResolveInfo, id: int) -> dict | None:
    if id <= 0:
        return None
    return get_concession_detail(id)


_GRAPHQL_SCHEMA.type_map["Query"].fields["concessionsMapCore"].resolve = _resolve_concessions_map
_GRAPHQL_SCHEMA.type_map["Query"].fields["concessionsMap"].resolve = _resolve_concessions_map
_GRAPHQL_SCHEMA.type_map["Query"].fields["concessionsFilterIndex"].resolve = _resolve_concessions_filter_index
_GRAPHQL_SCHEMA.type_map["Query"].fields["concession"].resolve = _resolve_concession


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"ok": "true", "time": utc_now_iso()}


@app.post("/api/concesiones/graphql")
def api_graphql(payload: GraphQLPayload) -> dict:
    result = graphql_sync(
        _GRAPHQL_SCHEMA,
        source=payload.query,
        variable_values=payload.variables or {},
        operation_name=payload.operationName,
    )
    response: dict[str, object] = {"data": result.data}
    if result.errors:
        response["errors"] = [{"message": err.message} for err in result.errors]
    return response


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
