-- Connections, connection requests, and external GitHub invites

CREATE TABLE IF NOT EXISTS public.connection_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  CHECK (requester_id <> recipient_id),
  UNIQUE(requester_id, recipient_id)
);

CREATE TABLE IF NOT EXISTS public.connections (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id_1   UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user_id_2   UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CHECK (user_id_1 < user_id_2),
  UNIQUE(user_id_1, user_id_2)
);

CREATE TABLE IF NOT EXISTS public.external_invites (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inviter_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  github_login        TEXT NOT NULL,
  github_profile_url  TEXT NOT NULL,
  email               TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  sendgrid_message_id TEXT,
  error_message       TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(inviter_id, github_login)
);

CREATE INDEX IF NOT EXISTS idx_connection_requests_requester ON public.connection_requests (requester_id, status);
CREATE INDEX IF NOT EXISTS idx_connection_requests_recipient ON public.connection_requests (recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_connections_user_1 ON public.connections (user_id_1);
CREATE INDEX IF NOT EXISTS idx_connections_user_2 ON public.connections (user_id_2);
CREATE INDEX IF NOT EXISTS idx_external_invites_inviter ON public.external_invites (inviter_id);

ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_connection_requests_select" ON public.connection_requests FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
CREATE POLICY "own_connection_requests_insert" ON public.connection_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "own_connection_requests_update" ON public.connection_requests FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "own_connections_select" ON public.connections FOR SELECT
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);
CREATE POLICY "service_connections_insert" ON public.connections FOR INSERT
  WITH CHECK (true);

CREATE POLICY "own_external_invites_all" ON public.external_invites FOR ALL
  USING (auth.uid() = inviter_id)
  WITH CHECK (auth.uid() = inviter_id);

CREATE TRIGGER set_connection_requests_updated_at
  BEFORE UPDATE ON public.connection_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_external_invites_updated_at
  BEFORE UPDATE ON public.external_invites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
