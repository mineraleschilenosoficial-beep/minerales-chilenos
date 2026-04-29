from __future__ import annotations

import json
import os
import ssl
import urllib.request

from storage import get_dataset


def load_existing_dataset_safe() -> dict | None:
    try:
        return get_dataset()
    except Exception:  # noqa: BLE001
        return None


def apply_production_alerts(stats: dict[str, int]) -> int:
    alerts = 0
    mandatory_min_bp = int(os.getenv("ALERT_MANDATORY_COVERAGE_MIN_BP", "2000"))
    official_min_bp = int(os.getenv("ALERT_OFFICIAL_SOURCE_MIN_BP", "5000"))
    reliable_concession_min_bp = int(os.getenv("ALERT_RELIABLE_CONCESSION_MIN_BP", "2000"))
    if int(stats.get("kpiPctAllMandatoryFieldsBp", 0)) < mandatory_min_bp:
        alerts += 1
    if int(stats.get("kpiPctOfficialSourceBp", 0)) < official_min_bp:
        alerts += 1
    if int(stats.get("coverageReliableConcessionBp", 0)) < reliable_concession_min_bp:
        alerts += 1
    stats["alertsTriggered"] = alerts
    return alerts


def enforce_rollback_policy(previous: dict | None, current: dict, stats: dict[str, int]) -> None:
    if not previous:
        stats["rollbackChecked"] = 0
        return

    prev_items = previous.get("items")
    cur_items = current.get("items")
    if not isinstance(prev_items, list) or not isinstance(cur_items, list) or not prev_items:
        stats["rollbackChecked"] = 0
        return

    prev_count = len(prev_items)
    cur_count = len(cur_items)
    drop_ratio = max(0.0, (prev_count - cur_count) / prev_count)
    stats["rollbackChecked"] = 1
    stats["rollbackPrevCount"] = prev_count
    stats["rollbackCurrentCount"] = cur_count
    stats["rollbackDropRatioBp"] = int(round(drop_ratio * 10000))

    max_drop_ratio = float(os.getenv("ROLLBACK_MAX_ITEM_DROP_RATIO", "0.40"))
    if drop_ratio > max_drop_ratio:
        raise RuntimeError(
            "Rollback policy triggered: new dataset item count dropped too much "
            f"({cur_count}/{prev_count}, drop={drop_ratio:.2%}, limit={max_drop_ratio:.2%})."
        )


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
