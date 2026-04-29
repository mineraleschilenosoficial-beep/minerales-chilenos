#!/usr/bin/env python3
"""Run full refresh cycle for Coolify cron jobs."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path
import os


ROOT = Path(__file__).resolve().parents[2]


def run_step(command: list[str]) -> None:
    print(f"running: {' '.join(command)}")
    subprocess.run(command, cwd=ROOT, check=True)


def main() -> int:
    fast_local_mode = os.getenv("FAST_LOCAL_MODE", "").strip().lower() in {"1", "true", "yes", "on"}
    skip_validate = os.getenv("SKIP_VALIDATE", "").strip().lower() in {"1", "true", "yes", "on"}
    run_step([sys.executable, "scripts/daily_refresh.py"])
    if not skip_validate:
        run_step([sys.executable, "scripts/tools/validate_data.py"])
    else:
        print("SKIP_VALIDATE enabled: skipping validate_data")
    if not fast_local_mode:
        run_step([sys.executable, "scripts/tools/link_audit.py"])
    else:
        print("FAST_LOCAL_MODE enabled: skipping link_audit")
    print("refresh cycle completed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
