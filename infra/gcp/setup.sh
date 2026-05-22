#!/usr/bin/env bash
# One-time GCP bootstrap for CoFoundry on Cloud Run + Cloud Build CI/CD.
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-cofoundry-497002}"
REGION="${GCP_REGION:-us-central1}"
AR_REPO="${AR_REPO:-cofoundry}"
REPO_OWNER="${GITHUB_REPO_OWNER:-densub}"
REPO_NAME="${GITHUB_REPO_NAME:-cofoundry}"

echo "==> Project: $PROJECT_ID (region: $REGION)"

gcloud config set project "$PROJECT_ID"

echo "==> Enabling APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iam.googleapis.com \
  domains.googleapis.com \
  dns.googleapis.com \
  --quiet

echo "==> Artifact Registry repository..."
if ! gcloud artifacts repositories describe "$AR_REPO" --location="$REGION" &>/dev/null; then
  gcloud artifacts repositories create "$AR_REPO" \
    --repository-format=docker \
    --location="$REGION" \
    --description="CoFoundry container images"
fi

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
CLOUDBUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "==> IAM for Cloud Build ($CLOUDBUILD_SA)..."
for ROLE in \
  roles/run.admin \
  roles/iam.serviceAccountUser \
  roles/secretmanager.secretAccessor \
  roles/artifactregistry.writer; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${CLOUDBUILD_SA}" \
    --role="$ROLE" \
    --quiet >/dev/null
done

# Cloud Build GitHub connection (P4SA) needs Secret Manager for OAuth tokens
P4SA="service-${PROJECT_NUMBER}@gcp-sa-cloudbuild.iam.gserviceaccount.com"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${P4SA}" \
  --role="roles/secretmanager.admin" \
  --quiet >/dev/null

echo "==> GitHub connection (complete OAuth in browser if prompted)..."
if ! gcloud builds connections describe cofoundry-github --region="$REGION" &>/dev/null; then
  gcloud builds connections create github cofoundry-github --region="$REGION" --quiet || true
fi
gcloud builds connections describe cofoundry-github --region="$REGION" --format='yaml(installationState)' 2>/dev/null || true

echo "==> IAM for Cloud Run runtime ($RUNTIME_SA)..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --quiet >/dev/null

echo "==> Secret Manager placeholders (update values before first deploy)..."
SECRET_NAMES=(
  VITE_SUPABASE_URL_PROD
  VITE_SUPABASE_ANON_KEY_PROD
  SUPABASE_URL_PROD
  SUPABASE_ANON_KEY_PROD
  SUPABASE_SERVICE_ROLE_KEY_PROD
  ANTHROPIC_API_KEY
  OPENAI_API_KEY
  GITHUB_CLIENT_ID
  GITHUB_CLIENT_SECRET
  LINKEDIN_CLIENT_ID
  LINKEDIN_CLIENT_SECRET
)

for NAME in "${SECRET_NAMES[@]}"; do
  if ! gcloud secrets describe "$NAME" &>/dev/null; then
    echo -n "REPLACE_ME" | gcloud secrets create "$NAME" --data-file=- --quiet
    echo "    created secret: $NAME (placeholder — run sync-secrets.sh)"
  else
    echo "    exists: $NAME"
  fi
done

echo "==> Cloud Build trigger (after GitHub OAuth + repo link)..."
REPO_RESOURCE="projects/${PROJECT_ID}/locations/${REGION}/connections/cofoundry-github/repositories/${REPO_OWNER}-${REPO_NAME}"
if ! gcloud builds repositories describe "${REPO_OWNER}-${REPO_NAME}" \
  --connection=cofoundry-github --region="$REGION" &>/dev/null; then
  gcloud builds repositories create "${REPO_OWNER}-${REPO_NAME}" \
    --connection=cofoundry-github \
    --region="$REGION" \
    --remote-uri="https://github.com/${REPO_OWNER}/${REPO_NAME}.git" \
    --quiet 2>/dev/null || echo "    link GitHub repo after OAuth (see infra/gcp/README.md)"
fi

if gcloud builds triggers list --region="$REGION" --format="value(name)" 2>/dev/null | grep -q cofoundry-deploy-main; then
  echo "    trigger cofoundry-deploy-main already exists"
else
  gcloud builds triggers create github \
    --name="cofoundry-deploy-main" \
    --region="$REGION" \
    --repository="$REPO_RESOURCE" \
    --branch-pattern="^main$" \
    --build-config="cloudbuild.yaml" \
    --description="Deploy CoFoundry to Cloud Run on merge to main" \
    --quiet 2>/dev/null || {
      echo "    trigger not created yet — finish GitHub OAuth, then: ./infra/gcp/create-trigger.sh"
    }
fi

echo ""
echo "==> Done. Next steps:"
echo "  1. ./infra/gcp/sync-secrets.sh   # copy backend/.env + frontend/.env into Secret Manager"
echo "  2. git push origin main          # triggers deploy (after secrets are real)"
echo "  3. Register domain (see infra/gcp/DOMAIN.md)"
