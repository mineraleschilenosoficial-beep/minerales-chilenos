#!/usr/bin/env python3
"""Run Next.js frontend + FastAPI backend (no refresh cycle)."""

from __future__ import annotations

import argparse
import os
import socket
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_LOCAL_DATABASE_URL = "postgresql://minerales:minerales@localhost:5432/minerales"


def run_step(command: list[str]) -> None:
    print(f"running: {' '.join(command)}")
    subprocess.run(command, cwd=ROOT, check=True)


def spawn_process(command: list[str], env: dict[str, str] | None = None) -> subprocess.Popen:
    print(f"spawning: {' '.join(command)}")
    return subprocess.Popen(command, cwd=ROOT, env=env)


def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.25)
        return sock.connect_ex(("127.0.0.1", port)) == 0


def ensure_database_url(*, docker_db: bool) -> None:
    if os.getenv("DATABASE_URL", "").strip():
        return
    if docker_db:
        os.environ["DATABASE_URL"] = DEFAULT_LOCAL_DATABASE_URL
        print(f"DATABASE_URL not set, using default local DSN: {DEFAULT_LOCAL_DATABASE_URL}")
        return
    raise RuntimeError(
        "DATABASE_URL is required. Export it first or run with --docker-db to use local docker postgres."
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Next.js + FastAPI (no refresh cycle).")
    parser.add_argument(
        "--docker-db",
        action="store_true",
        help="Start local PostgreSQL using docker-compose.local.yml and use default DATABASE_URL if missing.",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.getenv("PORT", "8000")),
        help="Port for Next.js frontend (default: 8000).",
    )
    parser.add_argument(
        "--api-port",
        type=int,
        default=int(os.getenv("API_PORT", "8001")),
        help="Port for FastAPI backend (default: 8001).",
    )
    args = parser.parse_args()

    if args.docker_db:
        run_step(["docker", "compose", "-f", "docker-compose.local.yml", "up", "-d"])

    ensure_database_url(docker_db=args.docker_db)
    if is_port_in_use(args.port):
        print(f"port {args.port} already in use; frontend may already be running: http://localhost:{args.port}")
        return 0
    if is_port_in_use(args.api_port):
        print(f"port {args.api_port} already in use; backend may already be running: http://localhost:{args.api_port}")
        return 0

    env = os.environ.copy()
    env["PORT"] = str(args.port)
    env["API_PORT"] = str(args.api_port)
    env["FASTAPI_INTERNAL_URL"] = f"http://127.0.0.1:{args.api_port}"
    env.setdefault("NEXT_PUBLIC_API_BASE_URL", f"http://127.0.0.1:{args.api_port}")

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
        run_step(["yarn", "dev", "--port", str(args.port)])
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
