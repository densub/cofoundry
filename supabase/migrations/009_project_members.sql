-- Project membership for Build-a-Team: track who joined which project (idea or GitHub node)

CREATE TABLE IF NOT EXISTS public.project_members (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idea_id          UUID REFERENCES public.project_ideas(id) ON DELETE CASCADE,
  node_id          UUID REFERENCES public.nodes(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  added_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  role             TEXT,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  CHECK ((idea_id IS NULL) <> (node_id IS NULL))
);

-- Ensure a user can't be added twice to the same project reference
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_members_unique_idea
  ON public.project_members (idea_id, user_id)
  WHERE idea_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_members_unique_node
  ON public.project_members (node_id, user_id)
  WHERE node_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_project_members_user ON public.project_members (user_id, status);
CREATE INDEX IF NOT EXISTS idx_project_members_added_by ON public.project_members (added_by_user_id, status);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Members and inviters can view rows. Writes should go through the backend (service role).
CREATE POLICY "project_members_read" ON public.project_members FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = added_by_user_id);

CREATE POLICY "project_members_write_backend" ON public.project_members FOR ALL
  USING (false) WITH CHECK (false);

CREATE TRIGGER set_project_members_updated_at
  BEFORE UPDATE ON public.project_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

