#!/usr/bin/env bash
# Run after GitHub OAuth is complete for the cofoundry-github connection.
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-cofoundry-497002}"
REGION="${GCP_REGION:-us-central1}"
REPO_OWNER="${GITHUB_REPO_OWNER:-densub}"
REPO_NAME="${GITHUB_REPO_NAME:-cofoundry}"

gcloud config set project "$PROJECT_ID"

REPO_ID="${REPO_OWNER}-${REPO_NAME}"
REPO_RESOURCE="projects/${PROJECT_ID}/locations/${REGION}/connections/cofoundry-github/repositories/${REPO_ID}"

if ! gcloud builds repositories describe "$REPO_ID" \
  --connection=cofoundry-github --region="$REGION" &>/dev/null; then
  gcloud builds repositories create "$REPO_ID" \
    --connection=cofoundry-github \
    --region="$REGION" \
    --remote-uri="https://github.com/${REPO_OWNER}/${REPO_NAME}.git"
fi

gcloud builds triggers create github \
  --name="cofoundry-deploy-main" \
  --region="$REGION" \
  --repository="$REPO_RESOURCE" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --description="Deploy CoFoundry to Cloud Run on merge to main"

echo "Trigger cofoundry-deploy-main is ready."
