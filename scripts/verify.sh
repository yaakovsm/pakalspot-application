#!/usr/bin/env bash
set -euo pipefail

echo "[1/5] Helm template basic sanity..."
helm template ./pakalspot-chart -f pakalspot-chart/values.yaml >/dev/null

echo "[2/5] Check no hard-coded namespaces..."
if grep -R --line-number -E '^[[:space:]]*namespace:' pakalspot-chart/templates >/dev/null 2>&1; then
  echo "Found explicit namespaces in templates. Remove them unless absolutely required." && exit 1
fi

echo "[3/5] Frontend env wired..."
grep -R --line-number -E 'VITE_API_URL' pakalspot-chart/values*.yaml

echo "[4/5] No hard-coded localhost in frontend API calls..."
if grep -R --line-number -E 'http://(localhost|127\.0\.0\.1)' Frontend/src >/dev/null 2>&1; then
  echo "Found hard-coded localhost references in Frontend/src. Fix them." && exit 1
fi

echo "[5/5] Backend settings single DB_URL..."
DB_URL_COUNT=$(grep -R --line-number -E '^[[:space:]]*DB_URL[[:space:]]*:[[:space:]]*str[[:space:]]*=' Backend | wc -l | tr -d ' ')
if [ "${DB_URL_COUNT}" -ne 1 ]; then
  echo "Multiple DB_URL definitions found (${DB_URL_COUNT})." && exit 1
fi

echo "All basic checks passed."
