# CoFoundry domain (budget: under $15/year)

## Recommendation: **cofoundry.app** ($14/year via Google Cloud Domains)

Searched with `gcloud domains registrations search-domains cofoundry` on project `cofoundry-497002`:

| Domain | Price (Google) | Notes |
|--------|----------------|-------|
| **cofoundry.app** | **$14/year** | Exact brand match, under budget |
| co-foundry.dev | $12/year | Hyphenated, still on-brand |
| cofoundry.info | $12/year | Cheaper, weaker for a product |
| cofoundry.io | $60/year | Over budget |

`cofoundry.dev` did not appear as available in this search.

Register at **[Porkbun](https://porkbun.com)** or **[Cloudflare Registrar](https://www.cloudflare.com/products/registrar/)** (at-cost renewals, no markup).

## Search availability (CLI)

```bash
gcloud config set project cofoundry-497002
gcloud domains registrations search-domains cofoundry
```

## Register via Google Cloud Domains (optional)

```bash
# After search shows availability:
gcloud domains registrations register cofoundry.dev \
  --contact-data-from-file=infra/gcp/domain-contact.yaml \
  --quiet
```

## Point domain to Cloud Run (after deploy)

```bash
# Get frontend service URL
WEB_URL=$(gcloud run services describe cofoundry-web \
  --region=us-central1 --format='value(status.url)')

# Map custom domain (requires domain verified in Cloud Run)
gcloud run domain-mappings create \
  --service=cofoundry-web \
  --domain=www.cofoundry.dev \
  --region=us-central1
```

Follow the DNS records Cloud Run prints (usually CNAME to `ghs.googlehosted.com`).

## GitHub OAuth (production)

Update GitHub OAuth app:

- Homepage: `https://www.cofoundry.dev` (or your Cloud Run URL until DNS is live)
- Callback: `https://<BACKEND_CLOUD_RUN_URL>/api/integrations/github/callback`

Set `APP_URL` and `FRONTEND_URL` in Secret Manager / backend env to match production URLs.
