#!/usr/bin/env python3
"""Audit external links used by the static frontend."""

from __future__ import annotations

import json
import re
import ssl
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Dict, List


ROOT = Path(__file__).resolve().parents[1]
INDEX_FILE = ROOT / "index.html"
DATA_FILE = ROOT / "data" / "yacimientos.json"
REPORTS_DIR = ROOT / "reports"
REPORT_FILE = REPORTS_DIR / "link-check-report.json"

PRECONNECT_ONLY = {
    "https://fonts.googleapis.com",
    "https://fonts.gstatic.com",
}


def collect_urls() -> List[str]:
    index = INDEX_FILE.read_text(encoding="utf-8")
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))

    urls: List[str] = []
    for pattern in [r'href="(https?://[^"]+)"', r'src="(https?://[^"]+)"']:
        urls.extend(re.findall(pattern, index))

    for item in data.get("items", []):
        web = item.get("web")
        if isinstance(web, str) and web.startswith("http"):
            urls.append(web)
        for doc in item.get("docs", []) or []:
            doc_url = doc.get("url")
            if isinstance(doc_url, str) and doc_url.startswith("http"):
                urls.append(doc_url)

    unique: List[str] = []
    seen = set()
    for url in urls:
        if url not in seen:
            seen.add(url)
            unique.append(url)
    return unique


def check_url(url: str, ctx: ssl.SSLContext) -> Dict[str, str]:
    if url in PRECONNECT_ONLY:
        return {
            "url": url,
            "status": "skipped",
            "final_url": "",
            "error": "",
            "note": "preconnect-only"
        }

    methods = ("HEAD", "GET")
    last_error = ""
    for method in methods:
        try:
            request = urllib.request.Request(
                url,
                method=method,
                headers={"User-Agent": "Mozilla/5.0 (LinkAudit)"},
            )
            with urllib.request.urlopen(request, timeout=20, context=ctx) as response:
                code = response.getcode()
                return {
                    "url": url,
                    "status": str(code),
                    "final_url": response.geturl(),
                    "error": "",
                    "note": ""
                }
        except urllib.error.HTTPError as exc:
            # 401/403 can still mean endpoint exists but denies bots.
            if exc.code in (401, 403):
                return {
                    "url": url,
                    "status": str(exc.code),
                    "final_url": url,
                    "error": "",
                    "note": "reachable-but-restricted"
                }
            last_error = f"HTTP {exc.code}"
        except ssl.SSLError as exc:
            return {
                "url": url,
                "status": "ssl_warning",
                "final_url": "",
                "error": str(exc),
                "note": "ssl-certificate-issue"
            }
        except urllib.error.URLError as exc:
            # Some SSL problems are wrapped inside URLError.
            err = str(exc)
            if "CERTIFICATE_VERIFY_FAILED" in err or "certificate verify failed" in err.lower():
                return {
                    "url": url,
                    "status": "ssl_warning",
                    "final_url": "",
                    "error": err,
                    "note": "ssl-certificate-issue"
                }
            last_error = err
        except Exception as exc:  # noqa: BLE001
            last_error = str(exc)

    return {
        "url": url,
        "status": "",
        "final_url": "",
        "error": last_error,
        "note": ""
    }


def main() -> int:
    urls = collect_urls()
    ctx = ssl.create_default_context()

    results = [check_url(url, ctx) for url in urls]
    ok_statuses = {"200", "201", "301", "302", "307", "308", "401", "403", "skipped"}
    warn_statuses = {"ssl_warning"}
    ok = [r for r in results if r["status"] in ok_statuses]
    warnings = [r for r in results if r["status"] in warn_statuses]
    failed = [r for r in results if r["status"] not in ok_statuses and r["status"] not in warn_statuses]

    REPORTS_DIR.mkdir(exist_ok=True)
    report = {
      "checked": len(results),
      "ok_count": len(ok),
      "warning_count": len(warnings),
      "failed_count": len(failed),
      "results": results,
      "warnings": warnings,
      "failed": failed
    }
    REPORT_FILE.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"checked={len(results)} ok={len(ok)} warnings={len(warnings)} failed={len(failed)}")
    if warnings:
        for row in warnings:
            print(f"WARN {row['url']} -> {row['note']}")
    if failed:
        for row in failed:
            print(f"FAIL {row['url']} -> {row['error'] or row['status']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
