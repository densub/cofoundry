# CoFoundry on Google Cloud

Project: **cofoundry-497002** · Region: **us-central1**

| Resource | Name |
|----------|------|
| Artifact Registry | `us-central1-docker.pkg.dev/cofoundry-497002/cofoundry` |
| Cloud Run API | `cofoundry-api` |
| Cloud Run Web | `cofoundry-web` |
| CI/CD | GitHub Actions → Cloud Build ([GITHUB_ACTIONS.md](./GITHUB_ACTIONS.md)) |

## One-time setup

```bash
./infra/gcp/setup.sh          # APIs, registry, IAM, secrets placeholders
./infra/gcp/sync-secrets.sh   # push backend/.env + frontend/.env → Secret Manager
```

## Auto-deploy on push to `main`

See **[GITHUB_ACTIONS.md](./GITHUB_ACTIONS.md)** — one-time `GCP_SA_KEY` secret, then every merge to `main` deploys.

## Manual deploy

```bash
gcloud builds submit --config=cloudbuild.yaml --project=cofoundry-497002 .
```

## Domain (under $15/year)

**Recommended: `cofoundry.app` — $14/year** (exact name match, available in Cloud Domains)

Alternatives: `co-foundry.dev` ($12), `cofoundry.info` ($12)

See [DOMAIN.md](./DOMAIN.md) for registration and DNS → Cloud Run mapping.

## Production URLs

After deploy:

```bash
gcloud run services describe cofoundry-web --region=us-central1 --format='value(status.url)'
gcloud run services describe cofoundry-api --region=us-central1 --format='value(status.url)'
```

Update GitHub OAuth callback to `{API_URL}/api/integrations/github/callback`.
