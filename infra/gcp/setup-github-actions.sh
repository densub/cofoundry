#!/usr/bin/env bash
# One-time: service account for GitHub Actions → gcloud builds submit
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-cofoundry-497002}"
SA_NAME="${GITHUB_ACTIONS_SA_NAME:-github-actions-deploy}"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
KEY_FILE="${1:-./github-actions-key.json}"

echo "==> Project: $PROJECT_ID"
gcloud config set project "$PROJECT_ID"

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
CLOUDBUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

if ! gcloud iam service-accounts describe "$SA_EMAIL" &>/dev/null; then
  gcloud iam service-accounts create "$SA_NAME" \
    --display-name="GitHub Actions deploy (CoFoundry)"
fi

# Project roles: submit builds, upload source, read project
for ROLE in \
  roles/cloudbuild.builds.editor \
  roles/cloudbuild.builds.builder \
  roles/storage.admin \
  roles/logging.logWriter \
  roles/artifactregistry.writer \
  roles/viewer; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="$ROLE" \
    --quiet >/dev/null
done

# gcloud builds submit must act as the Cloud Build service account
for TARGET_SA in "$CLOUDBUILD_SA" "$COMPUTE_SA"; do
  gcloud iam service-accounts add-iam-policy-binding "$TARGET_SA" \
    --project="$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/iam.serviceAccountUser" \
    --quiet >/dev/null
  echo "    serviceAccountUser on ${TARGET_SA}"
done

gcloud iam service-accounts keys create "$KEY_FILE" \
  --iam-account="$SA_EMAIL"

echo ""
echo "==> Done. Add the key to GitHub:"
echo "  Repo: https://github.com/densub/cofoundry/settings/secrets/actions"
echo "  Secret name: GCP_SA_KEY"
echo "  Value: entire contents of $KEY_FILE"
echo ""
echo "Then delete the local key file:"
echo "  rm $KEY_FILE"
echo ""
echo "Pushes to main will run .github/workflows/deploy.yml automatically."
