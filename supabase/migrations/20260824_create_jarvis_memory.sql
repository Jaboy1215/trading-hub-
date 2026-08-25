-- Server-only cloud memory for the Trading Hub Jarvis container.
-- This table is intentionally not granted to anon/authenticated clients:
-- the app uses a server-side service-role client, so browser bundles cannot
-- directly read or mutate stored research context.
CREATE TABLE public.jarvis_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  container text NOT NULL,
  category text NOT NULL CHECK (
    category IN ('fact', 'preference', 'research', 'strategy', 'watchlist', 'temporary')
  ),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  importance smallint NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz,
  search_document tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(content, ''))
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX jarvis_memories_container_priority_idx
  ON public.jarvis_memories (container, importance DESC, updated_at DESC);
CREATE INDEX jarvis_memories_active_idx
  ON public.jarvis_memories (container, expires_at)
  WHERE expires_at IS NOT NULL;
CREATE INDEX jarvis_memories_search_idx
  ON public.jarvis_memories USING gin (search_document);

ALTER TABLE public.jarvis_memories ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.touch_jarvis_memory_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER jarvis_memories_touch_updated_at
  BEFORE UPDATE ON public.jarvis_memories
  FOR EACH ROW EXECUTE FUNCTION public.touch_jarvis_memory_updated_at();
