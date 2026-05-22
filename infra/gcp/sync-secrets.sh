#!/usr/bin/env bash
# Upload local .env values into GCP Secret Manager (never committed to git).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PROJECT_ID="${GCP_PROJECT_ID:-cofoundry-497002}"

gcloud config set project "$PROJECT_ID"

upsert_secret() {
  local name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "skip $name (empty)"
    return
  fi
  if gcloud secrets describe "$name" &>/dev/null; then
    echo -n "$value" | gcloud secrets versions add "$name" --data-file=- --quiet
    echo "updated $name"
  else
    echo -n "$value" | gcloud secrets create "$name" --data-file=- --quiet
    echo "created $name"
  fi
}

# shellcheck disable=SC1091
load_env() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  set -a
  # shellcheck source=/dev/null
  source "$file"
  set +a
}

load_env "$ROOT/backend/.env"
load_env "$ROOT/frontend/.env"

upsert_secret VITE_SUPABASE_URL_PROD "${VITE_SUPABASE_URL_PROD:-}"
upsert_secret VITE_SUPABASE_ANON_KEY_PROD "${VITE_SUPABASE_ANON_KEY_PROD:-}"
upsert_secret SUPABASE_URL_PROD "${SUPABASE_URL_PROD:-}"
upsert_secret SUPABASE_ANON_KEY_PROD "${SUPABASE_ANON_KEY_PROD:-}"
upsert_secret SUPABASE_SERVICE_ROLE_KEY_PROD "${SUPABASE_SERVICE_ROLE_KEY_PROD:-}"
upsert_secret ANTHROPIC_API_KEY "${ANTHROPIC_API_KEY:-}"
upsert_secret OPENAI_API_KEY "${OPENAI_API_KEY:-}"
upsert_secret GITHUB_CLIENT_ID_PROD "${GITHUB_CLIENT_ID_PROD:-}"
upsert_secret GITHUB_CLIENT_SECRET_PROD "${GITHUB_CLIENT_SECRET_PROD:-}"
upsert_secret LINKEDIN_CLIENT_ID "${LINKEDIN_CLIENT_ID:-}"
upsert_secret LINKEDIN_CLIENT_SECRET "${LINKEDIN_CLIENT_SECRET:-}"
upsert_secret SENDGRID_API_KEY "${SENDGRID_API_KEY:-}"
upsert_secret SENDGRID_FROM_EMAIL "${SENDGRID_FROM_EMAIL:-}"

echo "Secrets synced to project $PROJECT_ID"
