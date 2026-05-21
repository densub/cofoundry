-- OAuth integrations table
CREATE TABLE public.integrations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  provider          TEXT NOT NULL,          -- 'github' | 'linkedin'
  access_token      TEXT,
  refresh_token     TEXT,
  provider_user_id  TEXT,
  provider_username TEXT,
  metadata          JSONB DEFAULT '{}',     -- provider-specific data snapshot
  synced_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_integrations" ON public.integrations FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER set_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
