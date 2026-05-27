-- Project group chat messages (per project idea)

CREATE TABLE IF NOT EXISTS public.project_chat_messages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idea_id    UUID REFERENCES public.project_ideas(id) ON DELETE CASCADE NOT NULL,
  sender_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_chat_messages_idea
  ON public.project_chat_messages (idea_id, created_at ASC);

ALTER TABLE public.project_chat_messages ENABLE ROW LEVEL SECURITY;

-- Read access: project owner or active project member.
CREATE POLICY "project_chat_messages_read" ON public.project_chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.project_ideas i
      WHERE i.id = idea_id AND i.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.project_members pm
      WHERE pm.idea_id = idea_id AND pm.user_id = auth.uid() AND pm.status = 'active'
    )
  );

-- Write access: project owner or active project member (no updates/deletes via client).
CREATE POLICY "project_chat_messages_insert" ON public.project_chat_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1
        FROM public.project_ideas i
        WHERE i.id = idea_id AND i.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.project_members pm
        WHERE pm.idea_id = idea_id AND pm.user_id = auth.uid() AND pm.status = 'active'
      )
    )
  );

CREATE POLICY "project_chat_messages_no_update" ON public.project_chat_messages
  FOR UPDATE USING (false) WITH CHECK (false);

CREATE POLICY "project_chat_messages_no_delete" ON public.project_chat_messages
  FOR DELETE USING (false);

