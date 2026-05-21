# CoFoundry

Find collaborators who actually build what you build. CoFoundry connects your GitHub profile, builds a **project knowledge graph**, and matches you with founders on overlapping repos, stacks, and ideas — with AI-generated collaboration insights.

## Features

- **GitHub-powered onboarding** — Select which repos to import; your graph is built from real projects, not manual tags.
- **Interactive knowledge graph** — Explore projects as a force-directed bubble map on the dashboard.
- **Smart matching** — Semantic similarity over project nodes (OpenAI embeddings) plus cached AI insights (Claude).
- **Integrations** — GitHub OAuth for import/sync; LinkedIn OAuth scaffold for future profile enrichment.
- **Match cache** — Fingerprints and TTLs reduce repeat LLM calls for matches and insights.

## Tech stack

| Layer | Stack |
|-------|--------|
| Frontend | React 18, Vite, Tailwind CSS, Zustand, react-force-graph-2d |
| Backend | Node.js, Express, TypeScript |
| Database | Supabase (Postgres + Auth) |
| AI | Anthropic Claude (insights), OpenAI (embeddings) |

## Project structure

```
plugandplay/
├── frontend/          # React app (port 5173 dev / nginx in Docker)
├── backend/           # Express API (port 3001)
├── supabase/
│   └── migrations/    # SQL schema
├── docker-compose.yml # Run full stack in containers
├── migrate.js         # Run migrations against Supabase
├── .env.example       # Root env reference
└── package.json       # Dev scripts (concurrently)
```

## Prerequisites

- Node.js 18+ (local dev) or [Docker](https://docs.docker.com/get-docker/) (containerized)
- A [Supabase](https://supabase.com) project
- [Anthropic API key](https://console.anthropic.com/) (match insights)
- [OpenAI API key](https://platform.openai.com/) (embeddings — required for matching)
- [GitHub OAuth App](https://github.com/settings/developers) (repo import)

## Quick start

### 1. Clone and install

```bash
git clone <your-repo-url>
cd plugandplay
npm run install:all
```

### 2. Environment variables

Copy the example files and fill in your values:

```bash
cp .env.example backend/.env
cp frontend/.env.example frontend/.env
```

**Backend** (`backend/.env`):

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server only) |
| `SUPABASE_DB_PASSWORD` | DB password (for `npm run db:migrate`) |
| `ANTHROPIC_API_KEY` | Claude API key |
| `OPENAI_API_KEY` | Embeddings for matching |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth |
| `FRONTEND_URL` | e.g. `http://localhost:5173` |
| `APP_URL` | e.g. `http://localhost:3001` |

**Frontend** (`frontend/.env`):

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Same as backend Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | Same anon key |
| `VITE_API_URL` | Backend URL, e.g. `http://localhost:3001` |
| `VITE_AUTH_REDIRECT_URL` | Optional; default `{origin}/auth/callback` |

**Sign in / sign up with GitHub (Supabase Auth)**

1. Supabase → **Authentication** → **Providers** → enable **GitHub** and paste your GitHub OAuth app Client ID & Secret.
2. GitHub OAuth app → **Authorization callback URL**:  
   `https://voxxnyznweutlmrlgqmy.supabase.co/auth/v1/callback`
3. Supabase → **Authentication** → **URL Configuration** → add redirect URLs, e.g.  
   `http://localhost:5173/auth/callback` (and your production URL when deployed).

**GitHub OAuth (repo listing/import — separate app or same app with a second callback):**
`http://localhost:3001/api/integrations/github/callback`

Repo selection happens inside CoFoundry after OAuth. For GitHub-native per-repository authorization, migrate this integration to a GitHub App.

Never commit `.env` files — they are listed in `.gitignore`.

### 3. Database migrations

```bash
npm run db:migrate
```

### 4. Run locally

```bash
npm run dev
```

- App: http://localhost:5173  
- API: http://localhost:3001  

## Run with Docker

The stack runs as two containers: **backend** (Node API) and **frontend** (nginx serving the Vite build and proxying `/api` to the backend).

### 1. Configure env files

```bash
cp backend/.env.example backend/.env
# Fill in Supabase, Anthropic, OpenAI, GitHub OAuth, etc.

cp docker-compose.env.example .env
# Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (same values as frontend/.env)
```

For Docker, set OAuth URLs in `backend/.env`:

| Variable | Docker local value |
|----------|-------------------|
| `FRONTEND_URL` | `http://localhost:8080` |
| `APP_URL` | `http://localhost:3001` |

**GitHub OAuth callback** (unchanged — hits the API directly):  
`http://localhost:3001/api/integrations/github/callback`

### 2. Migrations (still on the host)

Docker does not run migrations. Apply schema once against Supabase:

```bash
npm run db:migrate
```

### 3. Start containers

```bash
npm run docker:up
# or: docker compose up --build
```

- App: http://localhost:8080  
- API: http://localhost:3001  
- Health: http://localhost:3001/health  

Stop: `npm run docker:down`

## Deploy on Google Cloud

**GitHub Actions** deploys to **Cloud Run** on every push to `main` (project `cofoundry-497002`).

One-time setup:

```bash
./infra/gcp/setup.sh                    # APIs, Artifact Registry, Secret Manager
./infra/gcp/sync-secrets.sh             # upload local .env → Secret Manager
./infra/gcp/setup-github-actions.sh     # create SA → add GCP_SA_KEY in GitHub repo secrets
```

See [infra/gcp/GITHUB_ACTIONS.md](infra/gcp/GITHUB_ACTIONS.md). Manual deploy: `gcloud builds submit --config=cloudbuild.yaml --project=cofoundry-497002 .`

Full docs: [infra/gcp/README.md](infra/gcp/README.md) · Domain: **cofoundry.app** — [infra/gcp/DOMAIN.md](infra/gcp/DOMAIN.md)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend + backend |
| `npm run dev:frontend` | Vite dev server only |
| `npm run dev:backend` | API with hot reload |
| `npm run build` | Production build |
| `npm run db:migrate` | Apply Supabase SQL migrations |
| `npm run docker:up` | Build and start Docker Compose stack |
| `npm run docker:down` | Stop containers |
| `npm run docker:build` | Build images without starting |

## Security notes

- Keep `SUPABASE_SERVICE_ROLE_KEY`, OAuth secrets, and API keys **only** in local `.env` files or your deployment platform’s secret store.
- Use `.env.example` files as templates; do not put real secrets in the repo.
- The service role key must never be exposed to the browser — only `VITE_*` public Supabase keys belong in the frontend.

## License

Private — all rights reserved unless otherwise specified.
