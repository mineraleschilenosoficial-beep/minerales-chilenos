#!/usr/bin/env python3
"""Runtime bootstrap: run DB migrations and optional dataset bootstrap."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

from storage import dataset_exists, run_schema_migrations


ROOT = Path(__file__).resolve().parents[1]


def _as_bool(env_value: str | None, default: bool = False) -> bool:
    if env_value is None:
        return default
    return env_value.strip().lower() in {"1", "true", "yes", "on"}


def main() -> int:
    print("bootstrap: running schema migrations")
    run_schema_migrations()

    auto_bootstrap_dataset = _as_bool(os.getenv("AUTO_BOOTSTRAP_DATASET"), default=True)
    if not auto_bootstrap_dataset:
        print("bootstrap: AUTO_BOOTSTRAP_DATASET disabled")
        return 0

    if dataset_exists():
        print("bootstrap: dataset already exists")
        return 0

    print("bootstrap: dataset missing, running daily refresh")
    subprocess.run([sys.executable, "scripts/daily_refresh.py"], cwd=ROOT, check=True)
    print("bootstrap: running dataset validation")
    subprocess.run([sys.executable, "scripts/validate_data.py"], cwd=ROOT, check=True)
    print("bootstrap: completed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
