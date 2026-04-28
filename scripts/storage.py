#!/usr/bin/env python3
"""Shared relational PostgreSQL storage helpers using SQLAlchemy ORM."""

from __future__ import annotations

import datetime as dt
import os
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    create_engine,
    delete,
    select,
    text,
    tuple_,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, selectinload


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


def _make_engine():
    dsn = _required_database_url()
    if dsn.startswith("postgresql://") and "postgresql+" not in dsn:
        dsn = dsn.replace("postgresql://", "postgresql+psycopg://", 1)
    return create_engine(dsn, future=True)


class Base(DeclarativeBase):
    pass


class DatasetMeta(Base):
    __tablename__ = "dataset_meta"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=dt.datetime.now(dt.timezone.utc))
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    last_verified_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=dt.datetime.now(dt.timezone.utc)
    )
    refresh_mode: Mapped[str] = mapped_column(Text, nullable=False, default="")
    scrape_source_name: Mapped[str] = mapped_column(Text, nullable=False, default="")
    sources: Mapped[list["DatasetMetaSource"]] = relationship(cascade="all, delete-orphan", back_populates="meta")
    stats: Mapped[list["DatasetMetaStat"]] = relationship(cascade="all, delete-orphan", back_populates="meta")


class DatasetMetaSource(Base):
    __tablename__ = "dataset_meta_sources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    meta_id: Mapped[int] = mapped_column(ForeignKey("dataset_meta.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    meta: Mapped["DatasetMeta"] = relationship(back_populates="sources")


class DatasetMetaStat(Base):
    __tablename__ = "dataset_meta_stats"
    __table_args__ = (UniqueConstraint("meta_id", "key", name="uq_dataset_meta_stats_meta_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    meta_id: Mapped[int] = mapped_column(ForeignKey("dataset_meta.id", ondelete="CASCADE"), nullable=False, index=True)
    key: Mapped[str] = mapped_column(String(120), nullable=False)
    value: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    meta: Mapped["DatasetMeta"] = relationship(back_populates="stats")


class MineRecord(Base):
    __tablename__ = "mine_records"
    __table_args__ = (
        CheckConstraint("confidence_score >= 0 AND confidence_score <= 1", name="ck_mine_records_confidence_0_1"),
        CheckConstraint("latitude >= -90 AND latitude <= 90", name="ck_mine_records_latitude_range"),
        CheckConstraint("longitude >= -180 AND longitude <= 180", name="ck_mine_records_longitude_range"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    region: Mapped[str] = mapped_column(Text, nullable=False)
    site_type: Mapped[str] = mapped_column(Text, nullable=False)
    mining_company: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    surface: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    altitude: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    production: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    workforce: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    average_salary: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    annual_revenue: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    future_hirings: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    operation_since: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    direct_workers: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    indirect_workers: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    hiring_plan_2026: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    data_origin: Mapped[str] = mapped_column(Text, nullable=False, default="source_unset")
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    enriched_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=dt.datetime.now(dt.timezone.utc))
    notes: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    website: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    is_available_concession: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    city: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    commune: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    province: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    locality: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    location: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    operation_site: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    address: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    minerals: Mapped[list["MineMineral"]] = relationship(cascade="all, delete-orphan", back_populates="mine")
    links: Mapped[list["MineLink"]] = relationship(cascade="all, delete-orphan", back_populates="mine")
    field_provenance: Mapped[list["MineFieldProvenance"]] = relationship(cascade="all, delete-orphan", back_populates="mine")
    source_catalog: Mapped[list["MineSourceCatalog"]] = relationship(cascade="all, delete-orphan", back_populates="mine")


class MineMineral(Base):
    __tablename__ = "mine_minerals"
    __table_args__ = (UniqueConstraint("mine_id", "mineral", name="uq_mine_minerals_mine_mineral"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mine_id: Mapped[int] = mapped_column(ForeignKey("mine_records.id", ondelete="CASCADE"), nullable=False, index=True)
    mineral: Mapped[str] = mapped_column(Text, nullable=False)
    mine: Mapped["MineRecord"] = relationship(back_populates="minerals")


class MineLink(Base):
    __tablename__ = "mine_links"
    __table_args__ = (UniqueConstraint("mine_id", "category", "url", name="uq_mine_links_mine_category_url"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mine_id: Mapped[int] = mapped_column(ForeignKey("mine_records.id", ondelete="CASCADE"), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    doc_type: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    mine: Mapped["MineRecord"] = relationship(back_populates="links")


class MineFieldProvenance(Base):
    __tablename__ = "mine_field_provenance"
    __table_args__ = (
        UniqueConstraint("mine_id", "field_name", "source_type", "source_url", name="uq_mine_field_provenance_key"),
        CheckConstraint(
            "(confidence_score IS NULL) OR (confidence_score >= 0 AND confidence_score <= 1)",
            name="ck_mine_field_provenance_confidence_0_1",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mine_id: Mapped[int] = mapped_column(ForeignKey("mine_records.id", ondelete="CASCADE"), nullable=False, index=True)
    field_name: Mapped[str] = mapped_column(String(80), nullable=False)
    field_value: Mapped[str] = mapped_column(Text, nullable=False, default="")
    source_url: Mapped[str] = mapped_column(Text, nullable=False, default="")
    source_type: Mapped[str] = mapped_column(String(40), nullable=False, default="")
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=dt.datetime.now(dt.timezone.utc))
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    mine: Mapped["MineRecord"] = relationship(back_populates="field_provenance")


class MineSourceCatalog(Base):
    __tablename__ = "mine_source_catalog"
    __table_args__ = (
        UniqueConstraint("mine_id", "source_url", "field_coverage", name="uq_mine_source_catalog_key"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mine_id: Mapped[int] = mapped_column(ForeignKey("mine_records.id", ondelete="CASCADE"), nullable=False, index=True)
    source_name: Mapped[str] = mapped_column(Text, nullable=False, default="")
    source_url: Mapped[str] = mapped_column(Text, nullable=False)
    field_coverage: Mapped[str] = mapped_column(String(80), nullable=False, default="general")
    last_checked_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=dt.datetime.now(dt.timezone.utc))
    mine: Mapped["MineRecord"] = relationship(back_populates="source_catalog")


class MineOverride(Base):
    __tablename__ = "mine_overrides"
    __table_args__ = (
        CheckConstraint(
            "(confidence_score IS NULL) OR (confidence_score >= 0 AND confidence_score <= 1)",
            name="ck_mine_overrides_confidence_0_1",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    target_name: Mapped[str] = mapped_column(Text, nullable=False)
    target_name_normalized: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    target_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    target_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    match_radius_deg: Mapped[float] = mapped_column(Float, nullable=False, default=0.05)
    mining_company: Mapped[str | None] = mapped_column(Text, nullable=True)
    website: Mapped[str | None] = mapped_column(Text, nullable=True)
    operation_since: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(Text, nullable=True)
    commune: Mapped[str | None] = mapped_column(Text, nullable=True)
    province: Mapped[str | None] = mapped_column(Text, nullable=True)
    locality: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(Text, nullable=True)
    operation_site: Mapped[str | None] = mapped_column(Text, nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_available_concession: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    data_origin: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    source_url: Mapped[str] = mapped_column(Text, nullable=False, default="")
    source_note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=dt.datetime.now(dt.timezone.utc))


class LinkReportRun(Base):
    __tablename__ = "link_report_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    checked: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ok_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    warning_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=dt.datetime.now(dt.timezone.utc))
    results: Mapped[list["LinkReportResult"]] = relationship(cascade="all, delete-orphan", back_populates="run")


class LinkReportResult(Base):
    __tablename__ = "link_report_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("link_report_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="")
    final_url: Mapped[str] = mapped_column(Text, nullable=False, default="")
    error: Mapped[str] = mapped_column(Text, nullable=False, default="")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    run: Mapped["LinkReportRun"] = relationship(back_populates="results")


class ReverseGeocodeCache(Base):
    __tablename__ = "reverse_geocode_cache"
    __table_args__ = (UniqueConstraint("latitude_key", "longitude_key", name="uq_reverse_geocode_cache_coords"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    latitude_key: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    longitude_key: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    city: Mapped[str] = mapped_column(Text, nullable=False, default="")
    commune: Mapped[str] = mapped_column(Text, nullable=False, default="")
    province: Mapped[str] = mapped_column(Text, nullable=False, default="")
    locality: Mapped[str] = mapped_column(Text, nullable=False, default="")
    location: Mapped[str] = mapped_column(Text, nullable=False, default="")
    address: Mapped[str] = mapped_column(Text, nullable=False, default="")
    source_url: Mapped[str] = mapped_column(Text, nullable=False, default="")
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=dt.datetime.now(dt.timezone.utc))


MINE_RECORD_OPTIONAL_TEXT_COLUMNS = (
    "mining_company",
    "surface",
    "altitude",
    "production",
    "workforce",
    "average_salary",
    "annual_revenue",
    "future_hirings",
    "operation_since",
    "direct_workers",
    "indirect_workers",
    "hiring_plan_2026",
    "notes",
    "city",
    "commune",
    "province",
    "locality",
    "location",
    "operation_site",
    "address",
)


def _null_if_sentinel(value: Any, *, website_field: bool = False) -> str | None:
    raw = str(value or "").strip()
    if not raw:
        return None
    if raw == "-" or raw.lower() in {"n/a", "na", "none", "null"}:
        return None
    if website_field and raw == "#":
        return None
    return raw


def _display_or_default(value: str | None, default: str = "-") -> str:
    if value is None:
        return default
    cleaned = str(value).strip()
    return cleaned if cleaned else default


def _parse_datetime(value: Any) -> dt.datetime:
    if isinstance(value, dt.datetime):
        parsed = value
    else:
        raw = str(value or "").strip()
        if not raw:
            return dt.datetime.now(dt.timezone.utc)
        parsed = dt.datetime.fromisoformat(raw.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=dt.timezone.utc)
    return parsed.astimezone(dt.timezone.utc)


def _datetime_to_iso(value: dt.datetime | None) -> str:
    if value is None:
        return ""
    if value.tzinfo is None:
        value = value.replace(tzinfo=dt.timezone.utc)
    return value.astimezone(dt.timezone.utc).isoformat()


def append_field_provenance(
    item: dict[str, Any],
    *,
    field_name: str,
    field_value: Any,
    source_type: str,
    source_url: str = "",
    confidence_score: float | None = None,
    note: str = "",
    updated_at: str | None = None,
) -> None:
    if not isinstance(item, dict):
        return
    target_value = str(field_value or "").strip()
    if not target_value:
        return
    provenance = item.get("field_provenance")
    if not isinstance(provenance, list):
        provenance = []
        item["field_provenance"] = provenance

    payload = {
        "field_name": str(field_name).strip(),
        "field_value": target_value,
        "source_type": str(source_type).strip() or "inferred",
        "source_url": str(source_url or "").strip(),
        "updated_at": _datetime_to_iso(_parse_datetime(updated_at or utc_now_iso())),
    }
    if confidence_score is not None:
        payload["confidence_score"] = float(confidence_score)
    if note.strip():
        payload["note"] = note.strip()

    dedupe_key = (
        payload["field_name"],
        payload["source_type"],
        payload["source_url"],
        payload["field_value"],
    )
    for existing in provenance:
        if not isinstance(existing, dict):
            continue
        existing_key = (
            str(existing.get("field_name") or "").strip(),
            str(existing.get("source_type") or "").strip(),
            str(existing.get("source_url") or "").strip(),
            str(existing.get("field_value") or "").strip(),
        )
        if existing_key == dedupe_key:
            return
    provenance.append(payload)


def ensure_schema(engine) -> None:
    Base.metadata.create_all(engine)
    # Hard cutover: legacy JSON key-value table is no longer supported.
    with engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS app_state"))
        # Clean pre-existing duplicates before creating unique indexes.
        conn.execute(
            text(
                """
                DELETE FROM mine_minerals a
                USING mine_minerals b
                WHERE a.id > b.id
                  AND a.mine_id = b.mine_id
                  AND a.mineral = b.mineral
                """
            )
        )
        conn.execute(
            text(
                """
                DELETE FROM mine_links a
                USING mine_links b
                WHERE a.id > b.id
                  AND a.mine_id = b.mine_id
                  AND a.category = b.category
                  AND a.url = b.url
                """
            )
        )
        conn.execute(
            text(
                """
                DELETE FROM dataset_meta_stats a
                USING dataset_meta_stats b
                WHERE a.id > b.id
                  AND a.meta_id = b.meta_id
                  AND a.key = b.key
                """
            )
        )
        conn.execute(
            text(
                """
                DELETE FROM reverse_geocode_cache a
                USING reverse_geocode_cache b
                WHERE a.id > b.id
                  AND a.latitude_key = b.latitude_key
                  AND a.longitude_key = b.longitude_key
                """
            )
        )
        conn.execute(
            text(
                """
                DELETE FROM mine_source_catalog a
                USING mine_source_catalog b
                WHERE a.id > b.id
                  AND a.mine_id = b.mine_id
                  AND a.source_url = b.source_url
                  AND a.field_coverage = b.field_coverage
                """
            )
        )

        # Enforce idempotent uniqueness at DB level (including existing deployments).
        conn.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_mine_minerals_mine_mineral_idx "
                "ON mine_minerals (mine_id, mineral)"
            )
        )
        conn.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_mine_links_mine_category_url_idx "
                "ON mine_links (mine_id, category, url)"
            )
        )
        conn.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_dataset_meta_stats_meta_key_idx "
                "ON dataset_meta_stats (meta_id, key)"
            )
        )
        conn.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_reverse_geocode_cache_coords_idx "
                "ON reverse_geocode_cache (latitude_key, longitude_key)"
            )
        )
        conn.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_mine_field_provenance_key_idx "
                "ON mine_field_provenance (mine_id, field_name, source_type, source_url)"
            )
        )
        conn.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_mine_source_catalog_key_idx "
                "ON mine_source_catalog (mine_id, source_url, field_coverage)"
            )
        )

        # Query-performance indexes for common API/filter paths.
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_mine_records_name ON mine_records (name)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_mine_records_city ON mine_records (city)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_mine_records_commune ON mine_records (commune)"))
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS idx_mine_records_available_concession "
                "ON mine_records (is_available_concession)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS idx_mine_field_provenance_field_name "
                "ON mine_field_provenance (field_name)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS idx_mine_source_catalog_coverage "
                "ON mine_source_catalog (field_coverage)"
            )
        )

        # Normalize nullable semantics for optional text fields in mine_records.
        for column_name in MINE_RECORD_OPTIONAL_TEXT_COLUMNS:
            conn.execute(text(f"ALTER TABLE mine_records ALTER COLUMN {column_name} DROP NOT NULL"))
            conn.execute(
                text(
                    f"""
                    UPDATE mine_records
                    SET {column_name} = NULL
                    WHERE {column_name} IS NOT NULL
                      AND btrim({column_name}) IN ('', '-', 'n/a', 'N/A', 'none', 'null')
                    """
                )
            )
        conn.execute(text("ALTER TABLE mine_records ALTER COLUMN website DROP NOT NULL"))
        conn.execute(
            text(
                """
                UPDATE mine_records
                SET website = NULL
                WHERE website IS NOT NULL
                  AND btrim(website) IN ('', '#', '-', 'n/a', 'N/A', 'none', 'null')
                """
            )
        )

        # Convert legacy TEXT timestamp columns to TIMESTAMPTZ when needed.
        timestamp_columns = (
            ("dataset_meta", "updated_at"),
            ("dataset_meta", "last_verified_at"),
            ("mine_records", "enriched_at"),
            ("mine_overrides", "updated_at"),
            ("link_report_runs", "created_at"),
            ("reverse_geocode_cache", "updated_at"),
            ("mine_field_provenance", "updated_at"),
        )
        for table_name, column_name in timestamp_columns:
            column_type = conn.execute(
                text(
                    """
                    SELECT data_type
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = :table_name
                      AND column_name = :column_name
                    """
                ),
                {"table_name": table_name, "column_name": column_name},
            ).scalar_one_or_none()
            if column_type == "timestamp with time zone":
                continue

            conn.execute(
                text(
                    f"""
                    UPDATE {table_name}
                    SET {column_name} = NOW()::text
                    WHERE {column_name} IS NULL OR btrim({column_name}::text) = ''
                    """
                )
            )
            conn.execute(
                text(
                    f"""
                    ALTER TABLE {table_name}
                    ALTER COLUMN {column_name} TYPE TIMESTAMPTZ
                    USING ({column_name}::timestamptz)
                    """
                )
            )


def _normalize_name(value: str) -> str:
    lowered = "".join(ch.lower() if ch.isalnum() else " " for ch in (value or ""))
    return " ".join(lowered.split())


def _override_matches(item: dict[str, Any], override: MineOverride) -> bool:
    item_name_norm = _normalize_name(str(item.get("name") or ""))
    if item_name_norm != override.target_name_normalized:
        return False

    if override.target_latitude is None or override.target_longitude is None:
        return True

    lat = item.get("latitude")
    lng = item.get("longitude")
    if not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)):
        return False

    radius = override.match_radius_deg if override.match_radius_deg > 0 else 0.05
    return abs(float(lat) - float(override.target_latitude)) <= radius and abs(float(lng) - float(override.target_longitude)) <= radius


def apply_manual_overrides(payload: dict[str, Any]) -> tuple[dict[str, Any], int]:
    items = payload.get("items")
    if not isinstance(items, list) or not items:
        return payload, 0

    engine = _make_engine()
    ensure_schema(engine)
    with Session(engine) as session:
        overrides = session.scalars(select(MineOverride).where(MineOverride.active.is_(True))).all()

    if not overrides:
        return payload, 0

    applied = 0
    now = utc_now_iso()
    for item in items:
        if not isinstance(item, dict):
            continue

        matched = next((ov for ov in overrides if _override_matches(item, ov)), None)
        if matched is None:
            continue

        for field in (
            "mining_company",
            "website",
            "operation_since",
            "city",
            "commune",
            "province",
            "locality",
            "location",
            "operation_site",
            "address",
        ):
            value = getattr(matched, field)
            if value is not None and str(value).strip():
                clean = str(value).strip()
                item[field] = clean
                append_field_provenance(
                    item,
                    field_name=field,
                    field_value=clean,
                    source_type="manual",
                    source_url=matched.source_url.strip(),
                    confidence_score=float(matched.confidence_score) if matched.confidence_score is not None else None,
                    note=matched.source_note.strip() or f"override_id={matched.id}",
                    updated_at=now,
                )

        if matched.is_available_concession is not None:
            item["is_available_concession"] = bool(matched.is_available_concession)
            append_field_provenance(
                item,
                field_name="is_available_concession",
                field_value=str(bool(matched.is_available_concession)).lower(),
                source_type="manual",
                source_url=matched.source_url.strip(),
                confidence_score=float(matched.confidence_score) if matched.confidence_score is not None else None,
                note=matched.source_note.strip() or f"override_id={matched.id}",
                updated_at=now,
            )
        if matched.data_origin and matched.data_origin.strip():
            item["data_origin"] = matched.data_origin.strip()
        if matched.confidence_score is not None:
            item["confidence_score"] = float(matched.confidence_score)

        item["enriched_at"] = now

        if matched.source_url.strip():
            src = {
                "name": "Manual override",
                "url": matched.source_url.strip(),
                "note": matched.source_note.strip() or f"override_id={matched.id}",
            }
            existing_sources = item.get("sources")
            if not isinstance(existing_sources, list):
                existing_sources = []
                item["sources"] = existing_sources
            if not any(isinstance(row, dict) and row.get("url") == src["url"] for row in existing_sources):
                existing_sources.append(src)
        applied += 1

    return payload, applied


def _coord_cache_key(lat: float, lng: float) -> tuple[float, float]:
    return (round(float(lat), 4), round(float(lng), 4))


def get_reverse_geocode_cache(points: list[tuple[float, float]]) -> dict[tuple[float, float], dict[str, str]]:
    if not points:
        return {}

    target_keys = {_coord_cache_key(lat, lng) for lat, lng in points}
    engine = _make_engine()
    ensure_schema(engine)
    with Session(engine) as session:
        rows = session.scalars(
            select(ReverseGeocodeCache).where(
                tuple_(ReverseGeocodeCache.latitude_key, ReverseGeocodeCache.longitude_key).in_(list(target_keys))
            )
        ).all()

    result: dict[tuple[float, float], dict[str, str]] = {}
    for row in rows:
        key = _coord_cache_key(row.latitude_key, row.longitude_key)
        if key not in target_keys:
            continue
        result[key] = {
            "city": row.city,
            "commune": row.commune,
            "province": row.province,
            "locality": row.locality,
            "location": row.location,
            "address": row.address,
            "source_url": row.source_url,
        }
    return result


def upsert_reverse_geocode_cache(entries: list[dict[str, Any]]) -> int:
    if not entries:
        return 0

    normalized: dict[tuple[float, float], dict[str, str]] = {}
    for entry in entries:
        try:
            key = _coord_cache_key(float(entry["latitude"]), float(entry["longitude"]))
        except Exception:  # noqa: BLE001
            continue
        normalized[key] = {
            "city": str(entry.get("city") or ""),
            "commune": str(entry.get("commune") or ""),
            "province": str(entry.get("province") or ""),
            "locality": str(entry.get("locality") or ""),
            "location": str(entry.get("location") or ""),
            "address": str(entry.get("address") or ""),
            "source_url": str(entry.get("source_url") or ""),
        }

    if not normalized:
        return 0

    engine = _make_engine()
    ensure_schema(engine)
    with Session(engine) as session:
        rows = session.scalars(
            select(ReverseGeocodeCache).where(
                tuple_(ReverseGeocodeCache.latitude_key, ReverseGeocodeCache.longitude_key).in_(list(normalized.keys()))
            )
        ).all()
        by_key = {_coord_cache_key(row.latitude_key, row.longitude_key): row for row in rows}

        written = 0
        now = utc_now_iso()
        for key, data in normalized.items():
            row = by_key.get(key)
            if row is None:
                row = ReverseGeocodeCache(latitude_key=key[0], longitude_key=key[1])
                session.add(row)
            row.city = data["city"]
            row.commune = data["commune"]
            row.province = data["province"]
            row.locality = data["locality"]
            row.location = data["location"]
            row.address = data["address"]
            row.source_url = data["source_url"]
            row.updated_at = now
            written += 1

        session.commit()
        return written


def _extract_link_rows(item: dict[str, Any]) -> list[dict[str, str]]:
    links: list[dict[str, str]] = []

    for src in item.get("sources", []) or []:
        if not isinstance(src, dict):
            continue
        links.append(
            {
                "category": "sources",
                "name": str(src.get("name") or src.get("url") or ""),
                "url": str(src.get("url") or ""),
                "note": str(src.get("note") or ""),
                "doc_type": "",
            }
        )

    for doc in item.get("docs", []) or []:
        if not isinstance(doc, dict):
            continue
        links.append(
            {
                "category": "docs",
                "name": str(doc.get("name") or doc.get("url") or ""),
                "url": str(doc.get("url") or ""),
                "note": "",
                "doc_type": str(doc.get("doc_type") or ""),
            }
        )

    resource_categories = (
        "environmental_reports",
        "operating_authorizations",
        "geology_studies",
        "mineral_life_studies",
        "mitigation_studies",
    )
    for category in resource_categories:
        for entry in item.get(category, []) or []:
            if isinstance(entry, str):
                links.append({"category": category, "name": entry, "url": entry, "note": "", "doc_type": ""})
                continue
            if not isinstance(entry, dict):
                continue
            links.append(
                {
                    "category": category,
                    "name": str(entry.get("name") or entry.get("url") or ""),
                    "url": str(entry.get("url") or ""),
                    "note": str(entry.get("note") or ""),
                    "doc_type": str(entry.get("doc_type") or ""),
                }
            )
    return [row for row in links if row["url"]]


def _extract_source_catalog_rows(item: dict[str, Any]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []

    for src in item.get("sources", []) or []:
        if not isinstance(src, dict):
            continue
        url = str(src.get("url") or "").strip()
        if not url:
            continue
        rows.append(
            {
                "source_name": str(src.get("name") or url).strip(),
                "source_url": url,
                "field_coverage": "general",
            }
        )

    coverage_lists = (
        "docs",
        "environmental_reports",
        "operating_authorizations",
        "geology_studies",
        "mineral_life_studies",
        "mitigation_studies",
    )
    for coverage in coverage_lists:
        for entry in item.get(coverage, []) or []:
            if isinstance(entry, str):
                url = entry.strip()
                if not url:
                    continue
                rows.append({"source_name": url, "source_url": url, "field_coverage": coverage})
                continue
            if not isinstance(entry, dict):
                continue
            url = str(entry.get("url") or "").strip()
            if not url:
                continue
            rows.append(
                {
                    "source_name": str(entry.get("name") or url).strip(),
                    "source_url": url,
                    "field_coverage": coverage,
                }
            )

    dedup: dict[tuple[str, str], dict[str, str]] = {}
    for row in rows:
        key = (row["source_url"], row["field_coverage"])
        dedup[key] = row
    return list(dedup.values())


def save_dataset(payload: dict[str, Any]) -> None:
    meta = payload.get("meta")
    items = payload.get("items")
    if not isinstance(meta, dict) or not isinstance(items, list):
        raise ValueError("Payload must include 'meta' object and 'items' list.")

    engine = _make_engine()
    ensure_schema(engine)

    with Session(engine) as session:
        session.execute(delete(MineLink))
        session.execute(delete(MineSourceCatalog))
        session.execute(delete(MineFieldProvenance))
        session.execute(delete(MineMineral))
        session.execute(delete(MineRecord))
        session.execute(delete(DatasetMetaSource))
        session.execute(delete(DatasetMetaStat))
        session.execute(delete(DatasetMeta))

        meta_row = DatasetMeta(
            id=1,
            updated_at=_parse_datetime(meta.get("updatedAt") or utc_now_iso()),
            version=int(meta.get("version") or 1),
            source=str(meta.get("source") or "postgresql"),
            last_verified_at=_parse_datetime(meta.get("lastVerifiedAt") or utc_now_iso()),
            refresh_mode=str(meta.get("refreshMode") or ""),
            scrape_source_name=str(meta.get("scrapeSourceName") or ""),
        )
        session.add(meta_row)

        for src in meta.get("sources", []) or []:
            if not isinstance(src, dict):
                continue
            if not src.get("url"):
                continue
            meta_row.sources.append(
                DatasetMetaSource(
                    name=str(src.get("name") or src["url"]),
                    url=str(src["url"]),
                    note=str(src.get("note") or ""),
                )
            )

        scrape_stats = meta.get("scrapeStats")
        if isinstance(scrape_stats, dict):
            for key, value in scrape_stats.items():
                try:
                    numeric = int(value)
                except Exception:  # noqa: BLE001
                    continue
                meta_row.stats.append(DatasetMetaStat(key=str(key), value=numeric))

        for item in items:
            if not isinstance(item, dict):
                continue
            mine_id = item.get("id")
            if not isinstance(mine_id, int):
                raise ValueError("Each item.id must be integer")

            mine = MineRecord(
                id=mine_id,
                name=str(item.get("name") or ""),
                minerals=[],
                latitude=float(item.get("latitude")),
                longitude=float(item.get("longitude")),
                region=str(item.get("region") or ""),
                site_type=str(item.get("site_type") or ""),
                mining_company=_null_if_sentinel(item.get("mining_company")),
                surface=_null_if_sentinel(item.get("surface")),
                altitude=_null_if_sentinel(item.get("altitude")),
                production=_null_if_sentinel(item.get("production")),
                workforce=_null_if_sentinel(item.get("workforce")),
                average_salary=_null_if_sentinel(item.get("average_salary")),
                annual_revenue=_null_if_sentinel(item.get("annual_revenue")),
                future_hirings=_null_if_sentinel(item.get("future_hirings")),
                operation_since=_null_if_sentinel(item.get("operation_since")),
                direct_workers=_null_if_sentinel(item.get("direct_workers")),
                indirect_workers=_null_if_sentinel(item.get("indirect_workers")),
                hiring_plan_2026=_null_if_sentinel(item.get("hiring_plan_2026")),
                data_origin=str(item.get("data_origin") or "source_unset"),
                confidence_score=float(item.get("confidence_score") or 0.0),
                enriched_at=_parse_datetime(item.get("enriched_at") or utc_now_iso()),
                notes=_null_if_sentinel(item.get("notes")),
                website=_null_if_sentinel(item.get("website"), website_field=True),
                is_available_concession=bool(item.get("is_available_concession")),
                city=_null_if_sentinel(item.get("city")),
                commune=_null_if_sentinel(item.get("commune")),
                province=_null_if_sentinel(item.get("province")),
                locality=_null_if_sentinel(item.get("locality")),
                location=_null_if_sentinel(item.get("location")),
                operation_site=_null_if_sentinel(item.get("operation_site")),
                address=_null_if_sentinel(item.get("address")),
            )
            session.add(mine)

            for mineral in item.get("minerals", []) or []:
                text = str(mineral).strip()
                if text:
                    mine.minerals.append(MineMineral(mineral=text))

            for row in _extract_link_rows(item):
                mine.links.append(
                    MineLink(
                        category=row["category"],
                        name=row["name"],
                        url=row["url"],
                        note=row["note"],
                        doc_type=row["doc_type"],
                    )
                )

            for row in _extract_source_catalog_rows(item):
                mine.source_catalog.append(
                    MineSourceCatalog(
                        source_name=row["source_name"],
                        source_url=row["source_url"],
                        field_coverage=row["field_coverage"],
                        last_checked_at=_parse_datetime(utc_now_iso()),
                    )
                )

            for row in item.get("field_provenance", []) or []:
                if not isinstance(row, dict):
                    continue
                field_name = str(row.get("field_name") or "").strip()
                field_value = str(row.get("field_value") or "").strip()
                source_type = str(row.get("source_type") or "").strip()
                updated_at = str(row.get("updated_at") or "").strip()
                if not (field_name and source_type and updated_at):
                    continue
                mine.field_provenance.append(
                    MineFieldProvenance(
                        field_name=field_name,
                        field_value=field_value,
                        source_url=str(row.get("source_url") or ""),
                        source_type=source_type,
                        confidence_score=(
                            float(row["confidence_score"])
                            if row.get("confidence_score") is not None
                            else None
                        ),
                        updated_at=_parse_datetime(updated_at),
                        note=str(row.get("note") or ""),
                    )
                )
        session.commit()


def get_dataset() -> dict[str, Any]:
    engine = _make_engine()
    ensure_schema(engine)
    with Session(engine) as session:
        meta = session.scalar(
            select(DatasetMeta).options(selectinload(DatasetMeta.sources), selectinload(DatasetMeta.stats)).where(DatasetMeta.id == 1)
        )
        if meta is None:
            raise RuntimeError("Dataset not found in PostgreSQL. Run daily refresh to bootstrap data.")

        mines = session.scalars(
            select(MineRecord)
            .options(
                selectinload(MineRecord.minerals),
                selectinload(MineRecord.links),
                selectinload(MineRecord.field_provenance),
                selectinload(MineRecord.source_catalog),
            )
            .order_by(MineRecord.id.asc())
        ).all()

        def links_by_category(mine: MineRecord, category: str) -> list[dict[str, str]]:
            result: list[dict[str, str]] = []
            for link in mine.links:
                if link.category != category:
                    continue
                row = {"name": link.name, "url": link.url}
                if link.note:
                    row["note"] = link.note
                if link.doc_type:
                    row["doc_type"] = link.doc_type
                result.append(row)
            return result

        items = []
        for mine in mines:
            item = {
                "id": mine.id,
                "name": mine.name,
                "minerals": [m.mineral for m in mine.minerals],
                "latitude": mine.latitude,
                "longitude": mine.longitude,
                "region": mine.region,
                "site_type": mine.site_type,
                "mining_company": _display_or_default(mine.mining_company, "-"),
                "surface": _display_or_default(mine.surface, "-"),
                "altitude": _display_or_default(mine.altitude, "-"),
                "production": _display_or_default(mine.production, "-"),
                "workforce": _display_or_default(mine.workforce, "-"),
                "average_salary": _display_or_default(mine.average_salary, "-"),
                "annual_revenue": _display_or_default(mine.annual_revenue, "-"),
                "future_hirings": _display_or_default(mine.future_hirings, "-"),
                "operation_since": _display_or_default(mine.operation_since, "-"),
                "direct_workers": _display_or_default(mine.direct_workers, "-"),
                "indirect_workers": _display_or_default(mine.indirect_workers, "-"),
                "hiring_plan_2026": _display_or_default(mine.hiring_plan_2026, "-"),
                "data_origin": mine.data_origin,
                "confidence_score": mine.confidence_score,
                "enriched_at": _datetime_to_iso(mine.enriched_at),
                "notes": _display_or_default(mine.notes, ""),
                "website": _display_or_default(mine.website, "#"),
                "is_available_concession": mine.is_available_concession,
                "sources": links_by_category(mine, "sources"),
                "docs": links_by_category(mine, "docs"),
                "environmental_reports": links_by_category(mine, "environmental_reports"),
                "operating_authorizations": links_by_category(mine, "operating_authorizations"),
                "geology_studies": links_by_category(mine, "geology_studies"),
                "mineral_life_studies": links_by_category(mine, "mineral_life_studies"),
                "mitigation_studies": links_by_category(mine, "mitigation_studies"),
                "field_provenance": [
                    {
                        "field_name": row.field_name,
                        "field_value": row.field_value,
                        "source_url": row.source_url,
                        "source_type": row.source_type,
                        "confidence_score": row.confidence_score,
                        "updated_at": _datetime_to_iso(row.updated_at),
                        "note": row.note,
                    }
                    for row in mine.field_provenance
                ],
                "source_catalog": [
                    {
                        "source_name": row.source_name,
                        "source_url": row.source_url,
                        "field_coverage": row.field_coverage,
                        "last_checked_at": _datetime_to_iso(row.last_checked_at),
                    }
                    for row in mine.source_catalog
                ],
                "city": _display_or_default(mine.city, ""),
                "commune": _display_or_default(mine.commune, ""),
                "province": _display_or_default(mine.province, ""),
                "locality": _display_or_default(mine.locality, ""),
                "location": _display_or_default(mine.location, ""),
                "operation_site": _display_or_default(mine.operation_site, ""),
                "address": _display_or_default(mine.address, ""),
            }
            items.append(item)

        scrape_stats = {row.key: row.value for row in meta.stats}
        payload = {
            "meta": {
                "version": meta.version,
                "source": meta.source,
                "updatedAt": _datetime_to_iso(meta.updated_at),
                "lastVerifiedAt": _datetime_to_iso(meta.last_verified_at),
                "refreshMode": meta.refresh_mode,
                "scrapeSourceName": meta.scrape_source_name,
                "sources": [{"name": s.name, "url": s.url, "note": s.note} for s in meta.sources],
                "scrapeStats": scrape_stats,
            },
            "items": items,
        }
        return payload


def save_link_report(payload: dict[str, Any]) -> None:
    engine = _make_engine()
    ensure_schema(engine)
    with Session(engine) as session:
        run = LinkReportRun(
            checked=int(payload.get("checked") or 0),
            ok_count=int(payload.get("ok_count") or 0),
            warning_count=int(payload.get("warning_count") or 0),
            failed_count=int(payload.get("failed_count") or 0),
            created_at=_parse_datetime(utc_now_iso()),
        )
        session.add(run)

        for result in payload.get("results", []) or []:
            if not isinstance(result, dict):
                continue
            run.results.append(
                LinkReportResult(
                    url=str(result.get("url") or ""),
                    status=str(result.get("status") or ""),
                    final_url=str(result.get("final_url") or ""),
                    error=str(result.get("error") or ""),
                    note=str(result.get("note") or ""),
                )
            )
        session.commit()


def get_link_report() -> dict[str, Any] | None:
    engine = _make_engine()
    ensure_schema(engine)
    with Session(engine) as session:
        run = session.scalar(
            select(LinkReportRun).options(selectinload(LinkReportRun.results)).order_by(LinkReportRun.id.desc()).limit(1)
        )
        if run is None:
            return None

        results = [
            {
                "url": row.url,
                "status": row.status,
                "final_url": row.final_url,
                "error": row.error,
                "note": row.note,
            }
            for row in run.results
        ]
        warnings = [row for row in results if row["status"] == "ssl_warning"]
        ok_statuses = {"200", "201", "301", "302", "307", "308", "401", "403", "skipped"}
        failed = [row for row in results if row["status"] not in ok_statuses and row["status"] != "ssl_warning"]

        return {
            "checked": run.checked,
            "ok_count": run.ok_count,
            "warning_count": run.warning_count,
            "failed_count": run.failed_count,
            "results": results,
            "warnings": warnings,
            "failed": failed,
        }
