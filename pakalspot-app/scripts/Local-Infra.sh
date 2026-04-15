#!/bin/bash

set -euo pipefail

APP_DIR="/home/yaakovsm/bootcamp/pakalspot/pakalspot-application/pakalspot-app"
AWS_REGION="${AWS_REGION:-us-east-1}"
BACKEND_SECRET_ID="${BACKEND_SECRET_ID:-/pakalspot/backend}"
BACKEND_URL="http://localhost:8000"
FRONTEND_URL="http://localhost:3000"
TOTAL_STEPS=9
CURRENT_STEP=0

require_cmd() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "Error: required command not found: ${cmd}" >&2
    exit 1
  fi
}

step() {
  local message="$1"
  CURRENT_STEP=$((CURRENT_STEP + 1))
  echo "Step ${CURRENT_STEP}/${TOTAL_STEPS}: ${message}"
}

wait_for_http_ok() {
  local name="$1"
  local url="$2"
  local retries="$3"
  local delay_seconds="$4"
  local http_code

  for attempt in $(seq 1 "${retries}"); do
    http_code="$(curl -sS -o /tmp/pakalspot-http-check.json -w '%{http_code}' "${url}" || true)"
    echo "${name} readiness check ${attempt}/${retries}: HTTP ${http_code}"
    if [ "${http_code}" = "200" ]; then
      return 0
    fi
    sleep "${delay_seconds}"
  done

  echo "Error: ${name} not ready at ${url} after ${retries} attempts." >&2
  return 1
}

for cmd in docker aws jq curl; do
  require_cmd "${cmd}"
done

step "Move to app directory"
cd "${APP_DIR}"

step "Retrieve ADMIN_SEED_API_KEY from AWS Secrets Manager"
SECRET_STRING="$(
  aws secretsmanager get-secret-value \
    --secret-id "${BACKEND_SECRET_ID}" \
    --region "${AWS_REGION}" \
    --query SecretString \
    --output text
)"
ADMIN_SEED_API_KEY="$(printf '%s' "${SECRET_STRING}" | jq -r '.ADMIN_SEED_API_KEY // empty')"
if [ -z "${ADMIN_SEED_API_KEY}" ]; then
  echo "Error: ADMIN_SEED_API_KEY missing in secret '${BACKEND_SECRET_ID}'." >&2
  exit 1
fi
export ADMIN_SEED_API_KEY
echo "ADMIN_SEED_API_KEY retrieved: ${ADMIN_SEED_API_KEY:0:10}..."

step "Start Docker Compose services"
docker compose up -d

step "Verify core services are running"
for service in db backend frontend; do
  if ! docker compose ps --services --status running | jq -R -s -c 'split("\n") | map(select(length > 0))' | jq -e --arg service "${service}" 'index($service) != null' >/dev/null; then
    echo "Error: service '${service}' is not running." >&2
    docker compose ps
    exit 1
  fi
done
docker compose ps

step "Wait for backend health endpoint"
wait_for_http_ok "Backend" "${BACKEND_URL}/health" 30 2

step "Run database migrations"
docker compose exec backend alembic upgrade head

step "Trigger seed endpoint with retries"
seed_success=false
for attempt in 1 2 3 4 5; do
  seed_code="$(
    curl -sS -o /tmp/pakalspot-seed-response.json -w '%{http_code}' \
      -X POST "${BACKEND_URL}/api/admin/seed/init-spots" \
      -H "X-Seed-Key: ${ADMIN_SEED_API_KEY}" \
      -H "Content-Type: application/json" || true
  )"
  echo "Seed attempt ${attempt}/5: HTTP ${seed_code}"
  if [ "${seed_code}" -ge 200 ] && [ "${seed_code}" -lt 300 ]; then
    seed_success=true
    break
  fi
  sleep 5
done
if [ "${seed_success}" != "true" ]; then
  echo "Error: seed endpoint failed after retries." >&2
  if [ -f /tmp/pakalspot-seed-response.json ]; then
    cat /tmp/pakalspot-seed-response.json
  fi
  exit 1
fi
if [ -f /tmp/pakalspot-seed-response.json ]; then
  jq . /tmp/pakalspot-seed-response.json || cat /tmp/pakalspot-seed-response.json
fi

step "Verify spots endpoint data"
SPOTS_JSON="$(curl -sS "${BACKEND_URL}/api/spots/")"
if ! printf '%s' "${SPOTS_JSON}" | jq -e 'type == "array"' >/dev/null; then
  echo "Error: spots endpoint did not return a JSON array." >&2
  exit 1
fi
SPOTS_COUNT="$(printf '%s' "${SPOTS_JSON}" | jq 'length')"
if [ -z "${SPOTS_COUNT}" ] || [ "${SPOTS_COUNT}" -le 0 ]; then
  echo "Error: spots endpoint returned empty dataset after seed." >&2
  exit 1
fi

PHOTO_URL_COUNT="$(printf '%s' "${SPOTS_JSON}" | jq '[ .[] | .photos[]? | .url ] | length')"
if [ "${PHOTO_URL_COUNT}" -gt 0 ]; then
  echo "Verified spots include ${PHOTO_URL_COUNT} photo URL values."
else
  echo "No photo URLs found in spots payload; continuing."
fi

step "Verify frontend is reachable"
wait_for_http_ok "Frontend" "${FRONTEND_URL}" 30 2

echo "Local infra orchestration completed successfully."
echo "Spots count after seed: ${SPOTS_COUNT}"