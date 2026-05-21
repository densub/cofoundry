# CoFoundry

Find collaborators who actually build what you build. CoFoundry connects your GitHub profile, builds a **project knowledge graph**, and matches you with founders on overlapping repos, stacks, and ideas — with AI-generated collaboration insights.

## Features

- **GitHub-powered onboarding** — Import repos; your graph is built from real projects, not manual tags.
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
├── frontend/          # React app (port 5173)
├── backend/           # Express API (port 3001)
├── supabase/
│   └── migrations/    # SQL schema
├── migrate.js         # Run migrations against Supabase
├── .env.example       # Root env reference
└── package.json       # Dev scripts (concurrently)
```

## Prerequisites

- Node.js 18+
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

**GitHub OAuth callback:** `http://localhost:3001/api/integrations/github/callback`

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

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend + backend |
| `npm run dev:frontend` | Vite dev server only |
| `npm run dev:backend` | API with hot reload |
| `npm run build` | Production build |
| `npm run db:migrate` | Apply Supabase SQL migrations |

## Security notes

- Keep `SUPABASE_SERVICE_ROLE_KEY`, OAuth secrets, and API keys **only** in local `.env` files or your deployment platform’s secret store.
- Use `.env.example` files as templates; do not put real secrets in the repo.
- The service role key must never be exposed to the browser — only `VITE_*` public Supabase keys belong in the frontend.

## License

Private — all rights reserved unless otherwise specified.
