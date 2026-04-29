#!/usr/bin/env python3
"""Quick local runner: optional DB up, bootstrap, optional refresh, start Next.js + FastAPI."""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_LOCAL_DATABASE_URL = "postgresql://minerales:minerales@localhost:5432/minerales"


def run_step(command: list[str], *, env: dict[str, str] | None = None) -> None:
    print(f"running: {' '.join(command)}")
    subprocess.run(command, cwd=ROOT, check=True, env=env)


def spawn_process(command: list[str], *, env: dict[str, str] | None = None) -> subprocess.Popen:
    print(f"spawning: {' '.join(command)}")
    return subprocess.Popen(command, cwd=ROOT, env=env)


def ensure_database_url(*, docker_db: bool) -> str:
    current = os.getenv("DATABASE_URL", "").strip()
    if current:
        return current
    if docker_db:
        os.environ["DATABASE_URL"] = DEFAULT_LOCAL_DATABASE_URL
        print(f"DATABASE_URL not set, using default local DSN: {DEFAULT_LOCAL_DATABASE_URL}")
        return DEFAULT_LOCAL_DATABASE_URL
    raise RuntimeError(
        "DATABASE_URL is required. Export it first or run with --docker-db to use local docker postgres."
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run full local stack (Next.js + FastAPI), with or without data injection."
    )
    parser.add_argument(
        "--docker-db",
        action="store_true",
        help="Start local PostgreSQL using docker-compose.local.yml and use default DATABASE_URL if missing.",
    )
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="Legacy alias for data injection (same as --inject-data).",
    )
    parser.add_argument(
        "--inject-data",
        action="store_true",
        help="Inject data before startup (runs refresh_cycle).",
    )
    parser.add_argument(
        "--no-inject-data",
        action="store_true",
        help="Skip data injection and only start services.",
    )
    parser.add_argument(
        "--fast",
        action="store_true",
        help="With --refresh, skip link audit (FAST_LOCAL_MODE=true).",
    )
    parser.add_argument(
        "--quick",
        action="store_true",
        help="Quick local mode: implies --refresh --fast --skip-validate and limits refresh rows.",
    )
    parser.add_argument(
        "--skip-validate",
        action="store_true",
        help="With --refresh, skip validate_data step.",
    )
    parser.add_argument(
        "--max-records",
        type=int,
        default=0,
        help="With --refresh, cap SERNAGEOMIN rows to speed up local runs (0 means no cap).",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port for Next.js frontend (default: 8000).",
    )
    parser.add_argument(
        "--api-port",
        type=int,
        default=8001,
        help="Port for FastAPI backend (default: 8001).",
    )
    args = parser.parse_args()

    if args.docker_db:
        run_step(["docker", "compose", "-f", "docker-compose.local.yml", "up", "-d"])

    ensure_database_url(docker_db=args.docker_db)
    if args.inject_data and args.no_inject_data:
        raise RuntimeError("Use only one of --inject-data or --no-inject-data.")

    wants_refresh = bool(args.quick or args.inject_data or args.refresh)
    if args.no_inject_data:
        wants_refresh = False

    fast_mode = bool(args.fast or args.quick)
    skip_validate = bool(args.skip_validate or args.quick)
    max_records = args.max_records if args.max_records and args.max_records > 0 else 0
    if args.quick and max_records <= 0:
        max_records = 5000

    bootstrap_env = os.environ.copy()
    if wants_refresh:
        # Avoid double refresh: we run refresh_cycle explicitly below.
        bootstrap_env["AUTO_BOOTSTRAP_DATASET"] = "false"
    run_step([sys.executable, "scripts/tools/bootstrap_runtime.py"], env=bootstrap_env)

    if wants_refresh:
        env = os.environ.copy()
        if fast_mode:
            env["FAST_LOCAL_MODE"] = "true"
        if skip_validate:
            env["SKIP_VALIDATE"] = "true"
        if max_records > 0:
            env["SERNAGEOMIN_MAX_RECORDS"] = str(max_records)
        run_step([sys.executable, "scripts/tools/refresh_cycle.py"], env=env)
    else:
        print("data injection disabled: starting services without refresh")

    env = os.environ.copy()
    env["PORT"] = str(args.port)
    env["API_PORT"] = str(args.api_port)
    env["FASTAPI_INTERNAL_URL"] = f"http://127.0.0.1:{args.api_port}"

    print(f"starting fastapi at http://localhost:{args.api_port}")
    api_process = spawn_process(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "api.server:app",
            "--host",
            "0.0.0.0",
            "--port",
            str(args.api_port),
        ],
        env=env,
    )
    try:
        time.sleep(1.0)
        if api_process.poll() is not None:
            raise RuntimeError("FastAPI process exited unexpectedly during startup.")
        print(f"starting next service at http://localhost:{args.port}")
        run_step(["yarn", "dev", "--port", str(args.port)], env=env)
        return 0
    finally:
        if api_process.poll() is None:
            api_process.terminate()
            try:
                api_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                api_process.kill()


if __name__ == "__main__":
    raise SystemExit(main())
