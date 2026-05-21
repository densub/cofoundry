-- Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ───────────────────────────────────────────────
-- Profiles (extends Supabase auth.users)
-- ───────────────────────────────────────────────
CREATE TABLE public.profiles (
  id            UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username      TEXT UNIQUE,
  display_name  TEXT,
  role          TEXT,
  bio           TEXT,
  avatar_url    TEXT,
  is_onboarded  BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────
-- Node types
-- ───────────────────────────────────────────────
CREATE TYPE node_type AS ENUM (
  'root', 'project', 'interest', 'skill', 'expertise', 'idea', 'custom'
);

-- ───────────────────────────────────────────────
-- Graph nodes — each row is an MD file / bubble
-- ───────────────────────────────────────────────
CREATE TABLE public.nodes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  parent_id     UUID REFERENCES public.nodes(id) ON DELETE SET NULL,
  type          node_type NOT NULL DEFAULT 'custom',
  title         TEXT NOT NULL,
  content       TEXT NOT NULL DEFAULT '',
  summary       TEXT,
  embedding     VECTOR(1536),
  metadata      JSONB DEFAULT '{}',
  is_root       BOOLEAN DEFAULT FALSE,
  size_weight   FLOAT DEFAULT 1.0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────
-- Graph edges — relationships between nodes
-- ───────────────────────────────────────────────
CREATE TABLE public.edges (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_node_id      UUID REFERENCES public.nodes(id) ON DELETE CASCADE NOT NULL,
  to_node_id        UUID REFERENCES public.nodes(id) ON DELETE CASCADE NOT NULL,
  relationship_type TEXT DEFAULT 'related',
  weight            FLOAT DEFAULT 1.0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_node_id, to_node_id)
);

-- ───────────────────────────────────────────────
-- Conversations — persisted chat history per node
-- ───────────────────────────────────────────────
CREATE TABLE public.conversations (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  node_id    UUID REFERENCES public.nodes(id) ON DELETE SET NULL,
  title      TEXT,
  messages   JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────
-- Matches — cross-user similarity results
-- ───────────────────────────────────────────────
CREATE TABLE public.matches (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id_1        UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user_id_2        UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  similarity_score FLOAT NOT NULL,
  matched_nodes    JSONB DEFAULT '[]',
  status           TEXT DEFAULT 'pending',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id_1, user_id_2)
);

-- ───────────────────────────────────────────────
-- Indexes
-- ───────────────────────────────────────────────
CREATE INDEX idx_nodes_user_id ON public.nodes(user_id);
CREATE INDEX idx_nodes_parent_id ON public.nodes(parent_id);
CREATE INDEX idx_nodes_type ON public.nodes(type);
CREATE INDEX idx_edges_from ON public.edges(from_node_id);
CREATE INDEX idx_edges_to ON public.edges(to_node_id);
-- IVFFlat index for approximate nearest-neighbor vector search
CREATE INDEX idx_nodes_embedding ON public.nodes
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ───────────────────────────────────────────────
-- Row Level Security
-- ───────────────────────────────────────────────
ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nodes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edges        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches      ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "own_profile_all"          ON public.profiles FOR ALL     USING (auth.uid() = id);
CREATE POLICY "auth_view_profiles"       ON public.profiles FOR SELECT  USING (auth.role() = 'authenticated');

-- nodes: owner has full control; others can read (needed for matching)
CREATE POLICY "own_nodes_all"            ON public.nodes    FOR ALL     USING (auth.uid() = user_id);
CREATE POLICY "auth_view_nodes"          ON public.nodes    FOR SELECT  USING (auth.role() = 'authenticated');

-- edges: owner-derived from source node
CREATE POLICY "own_edges_all"            ON public.edges    FOR ALL
  USING (EXISTS (SELECT 1 FROM public.nodes n WHERE n.id = from_node_id AND n.user_id = auth.uid()));
CREATE POLICY "auth_view_edges"          ON public.edges    FOR SELECT  USING (auth.role() = 'authenticated');

-- conversations: strictly private
CREATE POLICY "own_conversations_all"    ON public.conversations FOR ALL USING (auth.uid() = user_id);

-- matches: visible to both parties
CREATE POLICY "own_matches_select"       ON public.matches  FOR SELECT
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);
CREATE POLICY "service_matches_insert"   ON public.matches  FOR INSERT  WITH CHECK (true);
CREATE POLICY "own_matches_update"       ON public.matches  FOR UPDATE
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- ───────────────────────────────────────────────
-- Auto-create profile on signup
-- ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ───────────────────────────────────────────────
-- Updated_at trigger
-- ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER set_profiles_updated_at    BEFORE UPDATE ON public.profiles    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_nodes_updated_at       BEFORE UPDATE ON public.nodes       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ───────────────────────────────────────────────
-- Vector similarity search function
-- ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.match_nodes(
  query_embedding  VECTOR(1536),
  match_threshold  FLOAT DEFAULT 0.5,
  match_count      INT   DEFAULT 20,
  exclude_user_id  UUID  DEFAULT NULL
)
RETURNS TABLE (
  id         UUID,
  user_id    UUID,
  title      TEXT,
  type       node_type,
  summary    TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    n.id,
    n.user_id,
    n.title,
    n.type,
    n.summary,
    1 - (n.embedding <=> query_embedding) AS similarity
  FROM public.nodes n
  WHERE
    n.embedding IS NOT NULL
    AND (exclude_user_id IS NULL OR n.user_id != exclude_user_id)
    AND 1 - (n.embedding <=> query_embedding) > match_threshold
  ORDER BY n.embedding <=> query_embedding
  LIMIT match_count;
$$;
