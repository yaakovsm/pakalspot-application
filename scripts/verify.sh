#!/usr/bin/env bash
set -euo pipefail

echo "[1/8] Helm template basic sanity..."
helm template ./pakalspot-chart -f pakalspot-chart/values.yaml >/dev/null

echo "[2/8] Check no hard-coded namespaces..."
if grep -R --line-number -E '^[[:space:]]*namespace:' pakalspot-chart/templates >/dev/null 2>&1; then
  echo "Found explicit namespaces in templates. Remove them unless absolutely required." && exit 1
fi

echo "[3/8] Frontend containerPort == 8080..."
if ! grep -q "containerPort: 8080" pakalspot-chart/templates/frontend-deployment.yaml; then
  echo "Frontend containerPort is not 8080" && exit 1
fi

echo "[4/8] Frontend service targetPort == 8080..."
if ! grep -q "targetPort: 8080" pakalspot-chart/values.yaml; then
  echo "Frontend service targetPort is not 8080" && exit 1
fi

echo "[5/8] No hard-coded localhost in frontend API calls..."
if grep -R --line-number -E 'http://(localhost|127\.0\.0\.1)' Frontend/src >/dev/null 2>&1; then
  echo "Found hard-coded localhost references in Frontend/src. Fix them." && exit 1
fi

echo "[6/8] Single DB_URL definition in backend templates..."
DB_URL_COUNT=$(grep -R --line-number -E 'DB_URL.*postgresql://' pakalspot-chart/templates | wc -l | tr -d ' ')
if [ "${DB_URL_COUNT}" -ne 1 ]; then
  echo "Multiple DB_URL definitions found in templates (${DB_URL_COUNT})." && exit 1
fi

echo "[7/8] Ingress has two paths: /api -> backend, / -> frontend..."
if ! grep -q "path: /api" pakalspot-chart/values.yaml || ! grep -q "path: /" pakalspot-chart/values.yaml; then
  echo "Ingress missing required paths" && exit 1
fi

echo "[8/8] No 'latest' image tags..."
if grep -R --line-number -E 'tag:.*latest' pakalspot-chart/values*.yaml >/dev/null 2>&1; then
  echo "Found 'latest' image tags. Pin to specific versions." && exit 1
fi

echo "All production readiness checks passed."
