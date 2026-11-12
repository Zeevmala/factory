#!/usr/bin/env bash
# The gate. The factory runs the default branch's copy of this file after every
# build, on a runner with a read-only token. Exit non-zero to fail the run.
# Keep it deterministic and CPU-only: tests marked gpu, slow or network are
# excluded here and belong in a separate, human-triggered job.
set -euo pipefail
APP_DIR=.   # monorepo: the folder that holds pyproject.toml, e.g. services/api
cd "$APP_DIR"

run() {
  if [ -f uv.lock ] && command -v uv >/dev/null 2>&1; then uv run "$@"; else "$@"; fi
}

run ruff check .
# run mypy src            # turn on once the codebase type-checks cleanly
run pytest -q -m "not gpu and not slow and not network"
