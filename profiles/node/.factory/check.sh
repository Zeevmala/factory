#!/usr/bin/env bash
# The gate. The factory runs the default branch's copy of this file after every
# build, on a runner with a read-only token. Exit non-zero to fail the run.
# Keep it deterministic: no live Firebase, Mapbox or other network calls.
set -euo pipefail
export CI=true
APP_DIR=.   # monorepo: the folder that holds package.json, e.g. apps/web
cd "$APP_DIR"

npm run --if-present lint
npm run --if-present typecheck
npm run test
npm run --if-present build
