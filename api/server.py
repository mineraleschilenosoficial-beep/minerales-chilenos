#!/usr/bin/env python3
"""Small API layer to serve frontend data from PostgreSQL."""

from __future__ import annotations

from pathlib import Path
import sys

from flask import Flask, jsonify, request, send_from_directory

ROOT = Path(__file__).resolve().parents[1]
ASSETS_ROOT = ROOT
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.storage import get_dataset, get_link_report, utc_now_iso

app = Flask(__name__, static_folder=None)


@app.get("/api/health")
def health() -> tuple[dict[str, str], int]:
    return {"ok": "true", "time": utc_now_iso()}, 200


@app.get("/api/yacimientos")
def api_yacimientos():
    dataset = get_dataset()
    return jsonify(dataset)


@app.get("/api/link-report")
def api_link_report():
    report = get_link_report()
    if report is None:
        return jsonify({"checked": 0, "ok_count": 0, "warning_count": 0, "failed_count": 0, "results": []})
    return jsonify(report)


@app.get("/")
def serve_index():
    return send_from_directory(ASSETS_ROOT, "index.html")


@app.get("/<path:path>")
def serve_static(path: str):
    return send_from_directory(ASSETS_ROOT, path)


@app.errorhandler(404)
def not_found(_error):
    if request.path.startswith("/api/"):
        return jsonify({"error": "Not Found", "path": request.path}), 404
    return send_from_directory(ASSETS_ROOT, "404.html"), 404


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
