# CoFoundry domain

## Registered: **cofoundry.app** ($14/year)

- State: **ACTIVE** (expires ~2027-05-21)
- DNS zone: `cofoundry-app` (Cloud DNS)
- Cloud Run mappings:
  - `https://cofoundry.app` → `cofoundry-web`
  - `https://www.cofoundry.app` → `cofoundry-web`
  - `https://api.cofoundry.app` → `cofoundry-api`

SSL certificates provision automatically after DNS propagates (often 15–60 minutes).

## Production URLs

| Purpose | URL |
|---------|-----|
| App | https://cofoundry.app |
| API | https://api.cofoundry.app |
| GitHub OAuth callback | https://api.cofoundry.app/api/integrations/github/callback |

Cloud Run env (already set on services):

- `FRONTEND_URL=https://cofoundry.app`
- `APP_URL=https://api.cofoundry.app`
- `BACKEND_URL=https://api.cofoundry.app` (frontend nginx proxy)

## GitHub OAuth app

Update at https://github.com/settings/developers:

- Homepage: `https://cofoundry.app`
- Authorization callback: `https://api.cofoundry.app/api/integrations/github/callback`

## Register another domain (CLI)

Contact file is gitignored. Copy the example:

```bash
cp infra/gcp/domain-contact.example.yaml infra/gcp/domain-contact.yaml
# edit domain-contact.yaml with your ICANN contact info

gcloud dns managed-zones create cofoundry-app --dns-name=cofoundry.app. --project=cofoundry-497002

gcloud domains registrations register cofoundry.app \
  --contact-data-from-file=infra/gcp/domain-contact.yaml \
  --contact-privacy=redacted-contact-data \
  --yearly-price="14.00 USD" \
  --cloud-dns-zone=cofoundry-app \
  --notices=hsts-preloaded \
  --project=cofoundry-497002
```

## ICANN

Verify the registrant email within **15 days** or the domain may be suspended.

## CI/CD trigger (still manual)

After GitHub OAuth in Cloud Console:

```bash
./infra/gcp/create-trigger.sh
```
