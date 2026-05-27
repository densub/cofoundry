-- Allow delegated project ownership via project_members

ALTER TABLE public.project_members
  ADD COLUMN IF NOT EXISTS is_owner BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_project_members_idea_owner
  ON public.project_members (idea_id, is_owner)
  WHERE idea_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_project_members_node_owner
  ON public.project_members (node_id, is_owner)
  WHERE node_id IS NOT NULL;

