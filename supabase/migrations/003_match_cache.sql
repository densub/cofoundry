-- Cache match insights (AI) and graph fingerprint for match list reuse
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS match_graph_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS matches_cached_at TIMESTAMPTZ;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS insights JSONB,
  ADD COLUMN IF NOT EXISTS insights_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_matches_user1_status ON public.matches (user_id_1, status);
CREATE INDEX IF NOT EXISTS idx_matches_user2_status ON public.matches (user_id_2, status);
