-- Enhance Build-a-Team for non-technical founders:
-- project_ideas lets anyone create projects without GitHub repos,
-- skills_description gives collaborators a richer bio surface,
-- idea_id on team_requests allows requests tied to ideas instead of nodes.

ALTER TABLE public.expertise_profiles
  ADD COLUMN IF NOT EXISTS skills_description TEXT;

CREATE TABLE IF NOT EXISTS public.project_ideas (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title                 TEXT NOT NULL,
  problem_statement     TEXT NOT NULL,
  solution_description  TEXT,
  target_market         TEXT,
  stage                 TEXT NOT NULL DEFAULT 'idea'
                          CHECK (stage IN ('idea', 'prototype', 'launched', 'growing')),
  skills_i_bring        TEXT,
  project_summary       TEXT,
  recommended_roles     JSONB NOT NULL DEFAULT '[]',
  analysis_at           TIMESTAMPTZ,
  status                TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'paused', 'filled')),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_ideas_user
  ON public.project_ideas (user_id);
CREATE INDEX IF NOT EXISTS idx_project_ideas_active
  ON public.project_ideas (status, created_at DESC)
  WHERE status = 'active';

ALTER TABLE public.project_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_ideas_public_read" ON public.project_ideas
  FOR SELECT USING (true);

CREATE POLICY "project_ideas_owner_all" ON public.project_ideas
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Allow team_requests to reference project ideas (node_id becomes optional)
ALTER TABLE public.team_requests
  ALTER COLUMN node_id DROP NOT NULL;

ALTER TABLE public.team_requests
  ADD COLUMN IF NOT EXISTS idea_id UUID REFERENCES public.project_ideas(id) ON DELETE CASCADE;

-- Deduplicate idea-based requests (node_id-based requests keep the existing constraint)
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_req_unique_idea
  ON public.team_requests (from_user_id, to_user_id, idea_id)
  WHERE idea_id IS NOT NULL;

CREATE TRIGGER set_project_ideas_updated_at
  BEFORE UPDATE ON public.project_ideas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
