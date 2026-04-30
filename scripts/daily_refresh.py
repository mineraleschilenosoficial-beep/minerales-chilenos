#!/usr/bin/env python3
"""Refresh dataset from official SERNAGEOMIN source into PostgreSQL."""

from __future__ import annotations

import datetime as dt
import os
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Callable

from refresh.sernageomin_source import build_dataset_from_sernageomin
from storage import (
    get_dataset,
    refresh_mines_dataset_cache,
    save_dataset,
    utc_now_iso,
)


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _concession_attempts_from_env() -> int:
    raw = str(os.getenv("SERNAGEOMIN_CONCESSION_ATTEMPTS", "3")).strip()
    try:
        attempts = int(raw)
    except ValueError:
        attempts = 3
    if attempts < 1:
        return 1
    if attempts > 5:
        return 5
    return attempts


def _max_workers_from_env() -> int:
    raw = str(os.getenv("DAILY_REFRESH_MAX_WORKERS", "2")).strip()
    try:
        workers = int(raw)
    except ValueError:
        workers = 2
    if workers < 1:
        return 1
    if workers > 2:
        return 2
    return workers


def _load_concessions_with_retries(progress: Callable[[str], None], attempts: int | None = None) -> tuple[dict, dict[str, int]]:
    total_attempts = attempts if attempts is not None else _concession_attempts_from_env()
    last_error: Exception | None = None
    for attempt in range(1, total_attempts + 1):
        try:
            return build_dataset_from_sernageomin()
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            progress(f"concessions attempt {attempt}/{total_attempts} failed: {exc}")
            if attempt < total_attempts:
                time.sleep(2.5 * attempt)
    assert last_error is not None
    raise last_error


def main() -> int:
    started_at = time.monotonic()

    def progress(message: str) -> None:
        elapsed = time.monotonic() - started_at
        print(f"[daily_refresh +{elapsed:6.1f}s] {message}", flush=True)

    skip_mines_refresh = _env_bool("SKIP_MINES_REFRESH", False)
    refresh_mode = "sernageomin-only" if skip_mines_refresh else "sernageomin+mines"
    progress(f"start source={refresh_mode}")
    max_workers = _max_workers_from_env()
    if skip_mines_refresh and max_workers > 1:
        max_workers = 1
    progress(f"daily refresh workers={max_workers}")
    current: dict | None = None
    source_stats: dict[str, int] = {}
    mines_payload: dict | None = None
    mines_ok = False
    concessions_ok = False

    if skip_mines_refresh:
        progress("mines cache refresh skipped (SKIP_MINES_REFRESH enabled)")
        try:
            current, source_stats = _load_concessions_with_retries(progress)
            concessions_ok = True
            progress(f"concessions loaded items={len(current.get('items') or [])}")
        except Exception as exc:  # noqa: BLE001
            progress(f"concessions refresh failed after retries: {exc}")
    elif max_workers > 1:
        progress("fetching concessions and mines in parallel")
        with ThreadPoolExecutor(max_workers=max_workers) as pool:
            concessions_future = pool.submit(_load_concessions_with_retries, progress)
            mines_future = pool.submit(refresh_mines_dataset_cache)

            try:
                current, source_stats = concessions_future.result()
                concessions_ok = True
                progress(f"concessions loaded items={len(current.get('items') or [])}")
            except Exception as exc:  # noqa: BLE001
                progress(f"concessions refresh failed after retries: {exc}")

            try:
                mines_payload = mines_future.result()
                mines_ok = True
                progress(f"mines cache refreshed items={len(mines_payload.get('items') or [])}")
            except Exception as exc:  # noqa: BLE001
                progress(f"mines cache refresh failed: {exc}")
    else:
        progress("fetching concessions and mines sequentially (low-resource mode)")
        try:
            current, source_stats = _load_concessions_with_retries(progress)
            concessions_ok = True
            progress(f"concessions loaded items={len(current.get('items') or [])}")
        except Exception as exc:  # noqa: BLE001
            progress(f"concessions refresh failed after retries: {exc}")

        try:
            mines_payload = refresh_mines_dataset_cache()
            mines_ok = True
            progress(f"mines cache refreshed items={len(mines_payload.get('items') or [])}")
        except Exception as exc:  # noqa: BLE001
            progress(f"mines cache refresh failed: {exc}")

    if concessions_ok and isinstance(current, dict):
        current["meta"].setdefault("version", 1)
        current["meta"]["source"] = "sernageomin-catastro"
        current["meta"]["updatedAt"] = utc_now_iso()
        current["meta"]["lastVerifiedAt"] = utc_now_iso()
        current["meta"]["refreshMode"] = refresh_mode
        stats = current["meta"].get("scrapeStats")
        if not isinstance(stats, dict):
            stats = {}
            current["meta"]["scrapeStats"] = stats
        for key, value in source_stats.items():
            stats[key] = int(value)
        if mines_ok:
            stats["minesCacheRefreshOk"] = 1
            stats["minesCacheRefreshedAt"] = int(dt.datetime.now(dt.timezone.utc).timestamp())
        else:
            stats["minesCacheRefreshOk"] = 0

        progress("save concessions dataset")
        save_dataset(current)
        progress("complete mode=sernageomin+mines")
        return 0

    # If concessions failed, keep existing concessions dataset in DB and
    # only fail hard when there is no dataset at all.
    try:
        existing = get_dataset()
        progress(
            "concessions refresh skipped (using previously saved dataset)"
            f" items={len(existing.get('items') or [])}"
        )
        if mines_ok:
            progress("complete with partial success (mines cache refreshed)")
            return 0
        progress("complete with fallback only (no refresh applied)")
        return 0
    except Exception as exc:  # noqa: BLE001
        progress(f"no fallback concessions dataset available: {exc}")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
