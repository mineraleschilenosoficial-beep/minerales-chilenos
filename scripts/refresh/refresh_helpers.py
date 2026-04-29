#!/usr/bin/env python3
"""Shared helper utilities for refresh pipeline steps."""

from __future__ import annotations

import os
import re


ENV_TRUE_VALUES = frozenset({"1", "true", "yes", "on"})
BOOL_TRUE_VALUES = frozenset({"1", "true", "yes", "si", "sí"})
BOOL_FALSE_VALUES = frozenset({"0", "false", "no"})


def is_present(value) -> bool:
    normalized = str(value or "").strip().lower()
    return bool(normalized) and normalized not in {"-", "#", "n/a", "na", "none", "null", "unknown"}


def normalize_doc_entry(entry) -> dict[str, str] | None:
    if isinstance(entry, str):
        url = entry.strip()
        if not url:
            return None
        return {"name": url, "url": url, "note": "", "doc_type": ""}
    if not isinstance(entry, dict):
        return None
    url = str(entry.get("url") or "").strip()
    if not url:
        return None
    return {
        "name": str(entry.get("name") or url).strip(),
        "url": url,
        "note": str(entry.get("note") or "").strip(),
        "doc_type": str(entry.get("doc_type") or "").strip(),
    }


def normalized_doc_rows(values) -> list[dict[str, str]]:
    rows = [normalize_doc_entry(value) for value in (values or [])]
    return [row for row in rows if row]


def ensure_item_list(item: dict, field_name: str) -> list:
    rows = item.get(field_name)
    if isinstance(rows, list):
        return rows
    rows = []
    item[field_name] = rows
    return rows


def collect_url_set(rows: list) -> set[str]:
    return {
        str((row.get("url") if isinstance(row, dict) else row) or "").strip()
        for row in rows
        if isinstance(row, (dict, str))
    }


def list_has_http_url(rows: list) -> bool:
    for row in rows:
        if isinstance(row, str) and row.startswith(("http://", "https://")):
            return True
        if isinstance(row, dict):
            candidate = str(row.get("url") or "").strip()
            if candidate.startswith(("http://", "https://")):
                return True
    return False


def extract_first_year(text: str) -> str | None:
    match = re.search(r"\b(19\d{2}|20\d{2})\b", text)
    return match.group(1) if match else None


def extract_number_from_keyword(text: str, keyword: str) -> str | None:
    pattern = rf"{keyword}\D{{0,24}}(\d{{1,7}})"
    match = re.search(pattern, text, flags=re.IGNORECASE)
    return match.group(1) if match else None


def extract_salary(text: str) -> str | None:
    match = re.search(r"\b(CLP|USD)\s*([\d\.\,]{3,})\b", text, flags=re.IGNORECASE)
    if match:
        return f"{match.group(1).upper()} {match.group(2)}"
    match = re.search(r"\$\s*([\d\.\,]{3,})\b", text)
    if match:
        return f"CLP {match.group(1)}"
    return None


def extract_revenue(text: str) -> str | None:
    match = re.search(r"\b(revenue|ingresos?)\b.{0,20}\b(CLP|USD)\s*([\d\.\,]+(?:m|mm|bn)?)", text, flags=re.IGNORECASE)
    if not match:
        return None
    return f"{match.group(2).upper()} {match.group(3)}"


def extract_hiring_2026(text: str) -> str | None:
    if "2026" not in text:
        return None
    match = re.search(r"\b(?:hiring|contrataci[oó]n|contrataciones?)\b.{0,24}(\d{1,6})", text, flags=re.IGNORECASE)
    if not match:
        return None
    return f"{match.group(1)} planned hires (2026)"


def normalize_flag(value: str | None) -> str:
    return str(value or "").strip().lower()


def env_enabled(name: str, default: str = "") -> bool:
    return normalize_flag(os.getenv(name, default)) in ENV_TRUE_VALUES


def merge_int_stats(target: dict, *stat_maps: dict[str, int]) -> None:
    for source in stat_maps:
        for key, value in source.items():
            target[key] = int(value)


def parse_bool_text(value: str | None) -> bool | None:
    normalized = normalize_flag(value)
    if normalized in BOOL_TRUE_VALUES:
        return True
    if normalized in BOOL_FALSE_VALUES:
        return False
    return None
