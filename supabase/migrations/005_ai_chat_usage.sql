-- Per-user AI node chat usage and exact response cache.

CREATE TABLE IF NOT EXISTS public.ai_chat_usage_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  node_id         UUID REFERENCES public.nodes(id) ON DELETE SET NULL,
  feature         TEXT NOT NULL DEFAULT 'node_chat',
  prompt_tokens   INTEGER NOT NULL DEFAULT 0,
  response_tokens INTEGER NOT NULL DEFAULT 0,
  cache_key       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_chat_response_cache (
  cache_key       TEXT PRIMARY KEY,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  node_id         UUID REFERENCES public.nodes(id) ON DELETE SET NULL,
  prompt_tokens   INTEGER NOT NULL DEFAULT 0,
  response_text   TEXT NOT NULL,
  response_tokens INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_usage_user_window
  ON public.ai_chat_usage_events (user_id, feature, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_chat_cache_user_node
  ON public.ai_chat_response_cache (user_id, node_id, expires_at DESC);

ALTER TABLE public.ai_chat_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_response_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_ai_chat_usage_select" ON public.ai_chat_usage_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "own_ai_chat_cache_select" ON public.ai_chat_response_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE TRIGGER set_ai_chat_response_cache_updated_at
  BEFORE UPDATE ON public.ai_chat_response_cache
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
