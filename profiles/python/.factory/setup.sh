#!/usr/bin/env bash
# Runs once before the agent starts. Install what the gate needs; nothing else.
# Heavy extras (GPU wheels, full training stacks) do not belong here: the gate
# runs on a CPU runner and should exercise logic on small fixtures.
set -euo pipefail
APP_DIR=.   # monorepo: the folder that holds pyproject.toml, e.g. services/api
cd "$APP_DIR"

if [ -f uv.lock ]; then
  python -m pip install --quiet uv
  uv sync --frozen
elif [ -f requirements-dev.txt ]; then
  python -m pip install --quiet -r requirements-dev.txt
elif [ -f requirements.txt ]; then
  python -m pip install --quiet -r requirements.txt pytest ruff
elif [ -f pyproject.toml ]; then
  python -m pip install --quiet -e ".[dev]" || python -m pip install --quiet -e . pytest ruff
fi
