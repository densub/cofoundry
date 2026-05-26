-- Allow a project idea to optionally reference a GitHub node for richer LLM analysis.
-- node_id SET NULL on delete so deleting an imported repo doesn't destroy the idea.
ALTER TABLE public.project_ideas
  ADD COLUMN IF NOT EXISTS node_id UUID REFERENCES public.nodes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_project_ideas_node ON public.project_ideas (node_id)
  WHERE node_id IS NOT NULL;
