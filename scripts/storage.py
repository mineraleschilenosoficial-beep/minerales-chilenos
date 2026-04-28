#!/usr/bin/env python3
"""Shared relational PostgreSQL storage helpers using SQLAlchemy ORM."""

from __future__ import annotations

import datetime as dt
import os
from typing import Any

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text, create_engine, delete, select, text
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
    updated_at: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    last_verified_at: Mapped[str] = mapped_column(Text, nullable=False, default="")
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

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    meta_id: Mapped[int] = mapped_column(ForeignKey("dataset_meta.id", ondelete="CASCADE"), nullable=False, index=True)
    key: Mapped[str] = mapped_column(String(120), nullable=False)
    value: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    meta: Mapped["DatasetMeta"] = relationship(back_populates="stats")


class MineRecord(Base):
    __tablename__ = "mine_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    region: Mapped[str] = mapped_column(Text, nullable=False)
    site_type: Mapped[str] = mapped_column(Text, nullable=False)
    mining_company: Mapped[str] = mapped_column(Text, nullable=False, default="-")
    surface: Mapped[str] = mapped_column(Text, nullable=False, default="-")
    altitude: Mapped[str] = mapped_column(Text, nullable=False, default="-")
    production: Mapped[str] = mapped_column(Text, nullable=False, default="-")
    workforce: Mapped[str] = mapped_column(Text, nullable=False, default="-")
    average_salary: Mapped[str] = mapped_column(Text, nullable=False, default="-")
    annual_revenue: Mapped[str] = mapped_column(Text, nullable=False, default="-")
    future_hirings: Mapped[str] = mapped_column(Text, nullable=False, default="-")
    operation_since: Mapped[str] = mapped_column(Text, nullable=False, default="-")
    direct_workers: Mapped[str] = mapped_column(Text, nullable=False, default="-")
    indirect_workers: Mapped[str] = mapped_column(Text, nullable=False, default="-")
    hiring_plan_2026: Mapped[str] = mapped_column(Text, nullable=False, default="-")
    data_origin: Mapped[str] = mapped_column(Text, nullable=False, default="source_unset")
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    enriched_at: Mapped[str] = mapped_column(Text, nullable=False, default="")
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    website: Mapped[str] = mapped_column(Text, nullable=False, default="#")
    is_available_concession: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    city: Mapped[str] = mapped_column(Text, nullable=False, default="")
    commune: Mapped[str] = mapped_column(Text, nullable=False, default="")
    province: Mapped[str] = mapped_column(Text, nullable=False, default="")
    locality: Mapped[str] = mapped_column(Text, nullable=False, default="")
    location: Mapped[str] = mapped_column(Text, nullable=False, default="")
    operation_site: Mapped[str] = mapped_column(Text, nullable=False, default="")
    address: Mapped[str] = mapped_column(Text, nullable=False, default="")
    minerals: Mapped[list["MineMineral"]] = relationship(cascade="all, delete-orphan", back_populates="mine")
    links: Mapped[list["MineLink"]] = relationship(cascade="all, delete-orphan", back_populates="mine")


class MineMineral(Base):
    __tablename__ = "mine_minerals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mine_id: Mapped[int] = mapped_column(ForeignKey("mine_records.id", ondelete="CASCADE"), nullable=False, index=True)
    mineral: Mapped[str] = mapped_column(Text, nullable=False)
    mine: Mapped["MineRecord"] = relationship(back_populates="minerals")


class MineLink(Base):
    __tablename__ = "mine_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mine_id: Mapped[int] = mapped_column(ForeignKey("mine_records.id", ondelete="CASCADE"), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    doc_type: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    mine: Mapped["MineRecord"] = relationship(back_populates="links")


class MineOverride(Base):
    __tablename__ = "mine_overrides"

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
    updated_at: Mapped[str] = mapped_column(Text, nullable=False, default=utc_now_iso)


class LinkReportRun(Base):
    __tablename__ = "link_report_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    checked: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ok_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    warning_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[str] = mapped_column(Text, nullable=False, default=utc_now_iso)
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


def ensure_schema(engine) -> None:
    Base.metadata.create_all(engine)
    # Hard cutover: legacy JSON key-value table is no longer supported.
    with engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS app_state"))


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
                item[field] = str(value).strip()

        if matched.is_available_concession is not None:
            item["is_available_concession"] = bool(matched.is_available_concession)
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


def save_dataset(payload: dict[str, Any]) -> None:
    meta = payload.get("meta")
    items = payload.get("items")
    if not isinstance(meta, dict) or not isinstance(items, list):
        raise ValueError("Payload must include 'meta' object and 'items' list.")

    engine = _make_engine()
    ensure_schema(engine)

    with Session(engine) as session:
        session.execute(delete(MineLink))
        session.execute(delete(MineMineral))
        session.execute(delete(MineRecord))
        session.execute(delete(DatasetMetaSource))
        session.execute(delete(DatasetMetaStat))
        session.execute(delete(DatasetMeta))

        meta_row = DatasetMeta(
            id=1,
            updated_at=str(meta.get("updatedAt") or utc_now_iso()),
            version=int(meta.get("version") or 1),
            source=str(meta.get("source") or "postgresql"),
            last_verified_at=str(meta.get("lastVerifiedAt") or ""),
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
                mining_company=str(item.get("mining_company") or "-"),
                surface=str(item.get("surface") or "-"),
                altitude=str(item.get("altitude") or "-"),
                production=str(item.get("production") or "-"),
                workforce=str(item.get("workforce") or "-"),
                average_salary=str(item.get("average_salary") or "-"),
                annual_revenue=str(item.get("annual_revenue") or "-"),
                future_hirings=str(item.get("future_hirings") or "-"),
                operation_since=str(item.get("operation_since") or "-"),
                direct_workers=str(item.get("direct_workers") or "-"),
                indirect_workers=str(item.get("indirect_workers") or "-"),
                hiring_plan_2026=str(item.get("hiring_plan_2026") or "-"),
                data_origin=str(item.get("data_origin") or "source_unset"),
                confidence_score=float(item.get("confidence_score") or 0.0),
                enriched_at=str(item.get("enriched_at") or ""),
                notes=str(item.get("notes") or ""),
                website=str(item.get("website") or "#"),
                is_available_concession=bool(item.get("is_available_concession")),
                city=str(item.get("city") or ""),
                commune=str(item.get("commune") or ""),
                province=str(item.get("province") or ""),
                locality=str(item.get("locality") or ""),
                location=str(item.get("location") or ""),
                operation_site=str(item.get("operation_site") or ""),
                address=str(item.get("address") or ""),
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
            select(MineRecord).options(selectinload(MineRecord.minerals), selectinload(MineRecord.links)).order_by(MineRecord.id.asc())
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
                "mining_company": mine.mining_company,
                "surface": mine.surface,
                "altitude": mine.altitude,
                "production": mine.production,
                "workforce": mine.workforce,
                "average_salary": mine.average_salary,
                "annual_revenue": mine.annual_revenue,
                "future_hirings": mine.future_hirings,
                "operation_since": mine.operation_since,
                "direct_workers": mine.direct_workers,
                "indirect_workers": mine.indirect_workers,
                "hiring_plan_2026": mine.hiring_plan_2026,
                "data_origin": mine.data_origin,
                "confidence_score": mine.confidence_score,
                "enriched_at": mine.enriched_at,
                "notes": mine.notes,
                "website": mine.website,
                "is_available_concession": mine.is_available_concession,
                "sources": links_by_category(mine, "sources"),
                "docs": links_by_category(mine, "docs"),
                "environmental_reports": links_by_category(mine, "environmental_reports"),
                "operating_authorizations": links_by_category(mine, "operating_authorizations"),
                "geology_studies": links_by_category(mine, "geology_studies"),
                "mineral_life_studies": links_by_category(mine, "mineral_life_studies"),
                "mitigation_studies": links_by_category(mine, "mitigation_studies"),
                "city": mine.city,
                "commune": mine.commune,
                "province": mine.province,
                "locality": mine.locality,
                "location": mine.location,
                "operation_site": mine.operation_site,
                "address": mine.address,
            }
            items.append(item)

        scrape_stats = {row.key: row.value for row in meta.stats}
        payload = {
            "meta": {
                "updatedAt": meta.updated_at,
                "version": meta.version,
                "source": meta.source,
                "lastVerifiedAt": meta.last_verified_at,
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
            created_at=utc_now_iso(),
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
