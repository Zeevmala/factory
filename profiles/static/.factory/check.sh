#!/usr/bin/env bash
# The gate. The factory runs the default branch's copy of this file after every
# build, on a runner with a read-only token. Exit non-zero to fail the run.
# Static site, no package.json: every check is plain Node, offline and
# deterministic. Replace the examples below with this project's real checks.
# A worked example with nine steps is in Zeevmala/solelot (.factory/check.sh).
set -euo pipefail

echo "== 1. JavaScript parses"
while IFS= read -r f; do
  node --check "$f"
done < <(git ls-files '*.js' '*.mjs')

echo "== 2. JSON parses"
while IFS= read -r f; do
  node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "$f"
done < <(git ls-files '*.json')

echo "== 3. Tests"
# Node's built-in runner needs no install. A project with no test file fails
# here on purpose: a gate with nothing to run proves nothing.
mapfile -t tests < <(git ls-files 'test-*.js' '*.test.js' '*.test.mjs')
if [ "${#tests[@]}" -eq 0 ]; then
  echo "FAIL: no test files (test-*.js, *.test.js, *.test.mjs). Add one, or edit this step."
  exit 1
fi
node --test "${tests[@]}"

echo "GATE PASSED"
