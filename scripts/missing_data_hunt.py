#!/usr/bin/env python3
"""Audit missing mandatory fields and generate discovery candidates."""

from __future__ import annotations

import json
import os
import re
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

from storage import get_dataset


ROOT = Path(__file__).resolve().parents[1]
OUT_JSON = ROOT / "reports" / "missing_data_hunt.json"
OUT_MD = ROOT / "reports" / "missing_data_hunt.md"


def _as_bool(raw: str | None, default: bool = False) -> bool:
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _discover_urls(query: str, limit: int = 3) -> list[str]:
    encoded = urllib.parse.quote_plus(query)
    url = f"https://duckduckgo.com/html/?q={encoded}"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (X11; Linux x86_64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
            )
        },
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read().decode("utf-8", errors="ignore")

    matches = re.findall(r'class="result__a" href="([^"]+)"', html)
    found: list[str] = []
    for href in matches:
        parsed = urllib.parse.urlparse(href)
        if parsed.path.startswith("/l/") and parsed.query:
            q = urllib.parse.parse_qs(parsed.query)
            target = q.get("uddg", [""])[0]
            if target:
                href = urllib.parse.unquote(target)
        if href.startswith("http://") or href.startswith("https://"):
            if href not in found:
                found.append(href)
        if len(found) >= limit:
            break
    return found


def main() -> int:
    payload = get_dataset()
    items = payload.get("items")
    if not isinstance(items, list):
        raise RuntimeError("dataset items missing")

    max_records = max(1, int(os.getenv("MISSING_HUNT_MAX_RECORDS", "50")))
    enable_web_search = _as_bool(os.getenv("MISSING_HUNT_WEB_SEARCH"), default=True)

    incomplete = []
    for item in items:
        if not isinstance(item, dict):
            continue
        status = str(item.get("record_status") or "").strip().lower()
        if status != "incomplete":
            continue
        gaps = item.get("mandatory_gaps")
        if not isinstance(gaps, list) or not gaps:
            continue
        incomplete.append(item)

    gap_counter: Counter[str] = Counter()
    for item in incomplete:
        for gap in item.get("mandatory_gaps", []):
            gap_counter[str(gap)] += 1

    selected = incomplete[:max_records]
    records = []
    for item in selected:
        name = str(item.get("name") or "").strip()
        region = str(item.get("region") or "").strip()
        gaps = [str(x).strip() for x in (item.get("mandatory_gaps") or []) if str(x).strip()]
        searches: list[dict[str, object]] = []
        for field in gaps:
            base_query = f'"{name}" {region} Chile {field.replace("_", " ")}'
            candidates: list[str] = []
            if enable_web_search:
                try:
                    candidates = _discover_urls(base_query, limit=3)
                except Exception:  # noqa: BLE001
                    candidates = []
            searches.append({"field": field, "query": base_query, "candidates": candidates})

        records.append(
            {
                "id": item.get("id"),
                "name": name,
                "region": region,
                "gaps": gaps,
                "searches": searches,
            }
        )

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(
        json.dumps(
            {
                "items_total": len(items),
                "incomplete_total": len(incomplete),
                "top_missing_fields": gap_counter.most_common(20),
                "records": records,
            },
            ensure_ascii=True,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    lines = [
        "# Missing Data Hunt Report",
        "",
        f"- items_total: {len(items)}",
        f"- incomplete_total: {len(incomplete)}",
        "",
        "## Top Missing Fields",
        "",
    ]
    for field, count in gap_counter.most_common(20):
        lines.append(f"- `{field}`: {count}")
    lines.append("")
    lines.append("## Candidate Searches")
    lines.append("")
    for row in records:
        lines.append(f"- Mine: `{row['name']}` ({row['region']})")
        for search in row["searches"]:
            lines.append(f"  - Field: `{search['field']}`")
            lines.append(f"  - Query: `{search['query']}`")
            if search["candidates"]:
                for cand in search["candidates"]:
                    lines.append(f"  - Candidate: {cand}")
            else:
                lines.append("  - Candidate: (none)")
        lines.append("")

    OUT_MD.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    print(f"wrote {OUT_JSON}")
    print(f"wrote {OUT_MD}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
