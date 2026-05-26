-- Build-a-Team feature: expertise profiles, team analyses, and team requests

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_type TEXT NOT NULL DEFAULT 'developer'
    CHECK (user_type IN ('developer', 'collaborator'));

CREATE TABLE IF NOT EXISTS public.expertise_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  headline        TEXT,
  expertise_tags  TEXT[] DEFAULT '{}',
  industries      TEXT[] DEFAULT '{}',
  linkedin_url    TEXT,
  portfolio_url   TEXT,
  past_ventures   TEXT,
  looking_for     TEXT CHECK (looking_for IN ('cofounder', 'early-team', 'advisor')),
  commitment      TEXT CHECK (commitment IN ('full-time', 'part-time', 'advisory')),
  open_to_equity  BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.team_analyses (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id           UUID REFERENCES public.nodes(id) ON DELETE CASCADE NOT NULL UNIQUE,
  owner_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  project_summary   TEXT NOT NULL,
  target_market     TEXT NOT NULL,
  project_stage     TEXT NOT NULL CHECK (project_stage IN ('idea', 'prototype', 'launched', 'growing')),
  recommended_roles JSONB NOT NULL DEFAULT '[]',
  raw_llm_response  TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.team_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  node_id       UUID REFERENCES public.nodes(id) ON DELETE CASCADE NOT NULL,
  role          TEXT NOT NULL,
  message       TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  direction     TEXT NOT NULL
                  CHECK (direction IN ('dev_to_collab', 'collab_to_dev')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  CHECK (from_user_id <> to_user_id),
  UNIQUE(from_user_id, to_user_id, node_id)
);

CREATE INDEX IF NOT EXISTS idx_team_analyses_owner ON public.team_analyses (owner_id);
CREATE INDEX IF NOT EXISTS idx_team_requests_from  ON public.team_requests (from_user_id, status);
CREATE INDEX IF NOT EXISTS idx_team_requests_to    ON public.team_requests (to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_expertise_tags      ON public.expertise_profiles USING GIN (expertise_tags);

ALTER TABLE public.expertise_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_analyses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_requests      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_expertise_profile" ON public.expertise_profiles FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expertise_profiles_read" ON public.expertise_profiles FOR SELECT
  USING (true);

CREATE POLICY "own_team_analyses_all" ON public.team_analyses FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "team_analyses_read" ON public.team_analyses FOR SELECT
  USING (true);

CREATE POLICY "own_team_requests" ON public.team_requests FOR ALL
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id)
  WITH CHECK (auth.uid() = from_user_id);

CREATE TRIGGER set_expertise_profiles_updated_at
  BEFORE UPDATE ON public.expertise_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_team_requests_updated_at
  BEFORE UPDATE ON public.team_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
