#!/usr/bin/env python3
"""Run full refresh cycle for Coolify cron jobs."""

from __future__ import annotations

import fcntl
import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
LOCK_FILE = ROOT / ".refresh_cycle.lock"


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int, *, min_value: int, max_value: int) -> int:
    raw = str(os.getenv(name, str(default))).strip()
    try:
        value = int(raw)
    except ValueError:
        value = default
    if value < min_value:
        return min_value
    if value > max_value:
        return max_value
    return value


def run_step(
    command: list[str],
    *,
    extra_env: dict[str, str] | None = None,
    timeout_seconds: int | None = None,
) -> None:
    print(f"running: {' '.join(command)}")
    env = os.environ.copy()
    if extra_env:
        env.update(extra_env)
    subprocess.run(command, cwd=ROOT, check=True, env=env, timeout=timeout_seconds)


def _daily_refresh_workers() -> str:
    # Safer default for small servers. Set DAILY_REFRESH_MAX_WORKERS=2 to re-enable parallel fetch.
    raw = str(os.getenv("DAILY_REFRESH_MAX_WORKERS", "1")).strip()
    try:
        workers = int(raw)
    except ValueError:
        workers = 1
    if workers < 1:
        workers = 1
    if workers > 2:
        workers = 2
    return str(workers)


def _lock_cycle() -> object | None:
    LOCK_FILE.parent.mkdir(parents=True, exist_ok=True)
    lock_handle = LOCK_FILE.open("w", encoding="utf-8")
    try:
        fcntl.flock(lock_handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        lock_handle.close()
        return None
    lock_handle.write(f"pid={os.getpid()}\n")
    lock_handle.flush()
    return lock_handle


def main() -> int:
    lock_handle = _lock_cycle()
    if lock_handle is None:
        print("refresh cycle already running; skipping this run")
        return 0

    try:
        # Resource-safe defaults for small VPS:
        # - FAST_LOCAL_MODE=True => skip link audit by default
        # - SKIP_VALIDATE=True => skip validation by default
        fast_local_mode = _env_bool("FAST_LOCAL_MODE", True)
        skip_validate = _env_bool("SKIP_VALIDATE", True)
        cpu_nice = _env_int("REFRESH_CPU_NICE", 10, min_value=0, max_value=19)
        daily_refresh_timeout = _env_int("DAILY_REFRESH_TIMEOUT_SECONDS", 5400, min_value=300, max_value=28800)
        validate_timeout = _env_int("VALIDATE_TIMEOUT_SECONDS", 1800, min_value=60, max_value=14400)
        link_audit_timeout = _env_int("LINK_AUDIT_TIMEOUT_SECONDS", 1800, min_value=60, max_value=14400)

        try:
            os.nice(cpu_nice)
        except OSError:
            # Keep going if runtime does not allow changing niceness.
            pass

        workers = _daily_refresh_workers()
        print(f"REFRESH_CPU_NICE={cpu_nice}")
        print(f"DAILY_REFRESH_MAX_WORKERS={workers}")
        run_step(
            [sys.executable, "scripts/daily_refresh.py"],
            extra_env={"DAILY_REFRESH_MAX_WORKERS": workers},
            timeout_seconds=daily_refresh_timeout,
        )
        if not skip_validate:
            run_step([sys.executable, "scripts/tools/validate_data.py"], timeout_seconds=validate_timeout)
        else:
            print("SKIP_VALIDATE enabled: skipping validate_data")
        if not fast_local_mode:
            run_step([sys.executable, "scripts/tools/link_audit.py"], timeout_seconds=link_audit_timeout)
        else:
            print("FAST_LOCAL_MODE enabled: skipping link_audit")
        print("refresh cycle completed")
        return 0
    finally:
        lock_handle.close()


if __name__ == "__main__":
    raise SystemExit(main())
