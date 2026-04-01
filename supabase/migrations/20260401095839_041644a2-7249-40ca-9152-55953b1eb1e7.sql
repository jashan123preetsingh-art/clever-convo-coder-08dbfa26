CREATE TABLE public.ai_analysis_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text UNIQUE NOT NULL,
  symbol text NOT NULL,
  mode text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes')
);

CREATE INDEX idx_ai_cache_key ON public.ai_analysis_cache(cache_key);
CREATE INDEX idx_ai_cache_expires ON public.ai_analysis_cache(expires_at);

ALTER TABLE public.ai_analysis_cache ENABLE ROW LEVEL SECURITY;