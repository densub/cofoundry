#!/usr/bin/env bash
# Upload local .env values into GCP Secret Manager (never committed to git).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PROJECT_ID="${GCP_PROJECT_ID:-cofoundry-497002}"

gcloud config set project "$PROJECT_ID"

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

# Resolve with fallbacks (local .env may use shorthand names).
resolve() {
  local primary="$1"
  shift
  local v="${!primary:-}"
  if [[ -n "$v" ]]; then
    printf '%s' "$v"
    return
  fi
  for alt in "$@"; do
    v="${!alt:-}"
    if [[ -n "$v" ]]; then
      printf '%s' "$v"
      return
    fi
  done
}

upsert_secret() {
  local name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "skip $name (empty — set in backend/.env or frontend/.env)"
    SKIPPED+=("$name")
    return
  fi
  if gcloud secrets describe "$name" &>/dev/null; then
    echo -n "$value" | gcloud secrets versions add "$name" --data-file=- --quiet
    echo "updated $name"
  else
    echo -n "$value" | gcloud secrets create "$name" --data-file=- --quiet
    echo "created $name"
  fi
  SYNCED+=("$name")
}

SKIPPED=()
SYNCED=()

upsert_secret VITE_SUPABASE_URL_PROD "$(resolve VITE_SUPABASE_URL_PROD VITE_SUPABASE_URL)"
upsert_secret VITE_SUPABASE_ANON_KEY_PROD "$(resolve VITE_SUPABASE_ANON_KEY_PROD VITE_SUPABASE_ANON_KEY)"
upsert_secret SUPABASE_URL_PROD "$(resolve SUPABASE_URL_PROD SUPABASE_URL VITE_SUPABASE_URL_PROD VITE_SUPABASE_URL)"
upsert_secret SUPABASE_ANON_KEY_PROD "$(resolve SUPABASE_ANON_KEY_PROD SUPABASE_ANON_KEY VITE_SUPABASE_ANON_KEY_PROD VITE_SUPABASE_ANON_KEY)"
upsert_secret SUPABASE_SERVICE_ROLE_KEY_PROD "$(resolve SUPABASE_SERVICE_ROLE_KEY_PROD SUPABASE_SERVICE_ROLE_KEY)"
upsert_secret SUPABASE_DATABASE_URL_PROD "$(resolve SUPABASE_DATABASE_URL_PROD DATABASE_URL)"
upsert_secret ANTHROPIC_API_KEY "$(resolve ANTHROPIC_API_KEY)"
upsert_secret OPENAI_API_KEY "$(resolve OPENAI_API_KEY)"
upsert_secret GITHUB_CLIENT_ID_PROD "$(resolve GITHUB_CLIENT_ID_PROD GITHUB_CLIENT_ID)"
upsert_secret GITHUB_CLIENT_SECRET_PROD "$(resolve GITHUB_CLIENT_SECRET_PROD GITHUB_CLIENT_SECRET)"
upsert_secret LINKEDIN_CLIENT_ID "$(resolve LINKEDIN_CLIENT_ID)"
upsert_secret LINKEDIN_CLIENT_SECRET "$(resolve LINKEDIN_CLIENT_SECRET)"
# Optional at runtime; cloudbuild still mounts them — placeholders when unset.
SENDGRID_KEY="$(resolve SENDGRID_API_KEY)"
SENDGRID_FROM="$(resolve SENDGRID_FROM_EMAIL)"
[[ -z "$SENDGRID_KEY" ]] && SENDGRID_KEY="disabled"
[[ -z "$SENDGRID_FROM" ]] && SENDGRID_FROM="noreply@cofoundry.app"
upsert_secret SENDGRID_API_KEY "$SENDGRID_KEY"
upsert_secret SENDGRID_FROM_EMAIL "$SENDGRID_FROM"

echo ""
echo "Synced ${#SYNCED[@]} secret(s) to project $PROJECT_ID"
if ((${#SKIPPED[@]} > 0)); then
  echo "Skipped (empty): ${SKIPPED[*]}"
fi

# Secrets required by cloudbuild.yaml (build will fail without these).
REQUIRED=(
  VITE_SUPABASE_URL_PROD
  VITE_SUPABASE_ANON_KEY_PROD
  SUPABASE_URL_PROD
  SUPABASE_ANON_KEY_PROD
  SUPABASE_SERVICE_ROLE_KEY_PROD
  SUPABASE_DATABASE_URL_PROD
  GITHUB_CLIENT_ID_PROD
  GITHUB_CLIENT_SECRET_PROD
)

MISSING=()
for name in "${REQUIRED[@]}"; do
  if ! gcloud secrets versions list "$name" --limit=1 --format='value(name)' 2>/dev/null | grep -q .; then
    MISSING+=("$name")
  fi
done

if ((${#MISSING[@]} > 0)); then
  echo ""
  echo "ERROR: cloudbuild.yaml requires these secrets with at least one version:"
  printf '  - %s\n' "${MISSING[@]}"
  exit 1
fi

echo "All required deploy secrets are present."
