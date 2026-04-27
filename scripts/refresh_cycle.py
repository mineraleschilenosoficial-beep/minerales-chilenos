#!/usr/bin/env python3
"""Run full refresh cycle for Coolify cron jobs."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def run_step(command: list[str]) -> None:
    print(f"running: {' '.join(command)}")
    subprocess.run(command, cwd=ROOT, check=True)


def main() -> int:
    run_step([sys.executable, "scripts/daily_refresh.py"])
    run_step([sys.executable, "scripts/validate_data.py"])
    run_step([sys.executable, "scripts/link_audit.py"])
    print("refresh cycle completed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
