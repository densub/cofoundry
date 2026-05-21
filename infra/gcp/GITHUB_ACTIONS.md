# GitHub Actions deploy

Every push to **`main`** runs [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml), which submits [`cloudbuild.yaml`](../../cloudbuild.yaml) to Google Cloud Build and deploys to Cloud Run.

## One-time setup

### 1. Create deploy service account + key

```bash
./infra/gcp/setup-github-actions.sh
```

This writes `github-actions-key.json` in the repo root (gitignored).

### 2. Add GitHub secret

1. Open [densub/cofoundry → Settings → Secrets and variables → Actions](https://github.com/densub/cofoundry/settings/secrets/actions)
2. **New repository secret**
3. Name: `GCP_SA_KEY`
4. Value: paste the full JSON from `github-actions-key.json`
5. Delete the local key file: `rm github-actions-key.json`

### 3. Push to main

The workflow runs automatically. Watch runs under **Actions** in GitHub.

## Production URLs (set in cloudbuild.yaml)

| Env | Value |
|-----|--------|
| `APP_URL` | `https://api.cofoundry.app` |
| `FRONTEND_URL` | `https://cofoundry.app` |
| `BACKEND_URL` (nginx) | `https://api.cofoundry.app` |

## Manual deploy (optional)

```bash
gcloud builds submit --config=cloudbuild.yaml --project=cofoundry-497002 .
```

## Troubleshooting

| Error | Fix |
|-------|-----|
| `GCP_SA_KEY` missing | Add the secret (step 2) |
| Permission denied on build submit | Re-run `setup-github-actions.sh` |
| Build fails on secrets | Run `./infra/gcp/sync-secrets.sh` |
