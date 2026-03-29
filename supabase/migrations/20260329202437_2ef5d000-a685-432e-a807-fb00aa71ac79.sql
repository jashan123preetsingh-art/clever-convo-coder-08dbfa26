
-- Watchlists table
CREATE TABLE public.watchlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  added_price numeric,
  quantity numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, symbol)
);

ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watchlist" ON public.watchlists
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlist" ON public.watchlists
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist" ON public.watchlists
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlist" ON public.watchlists
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Price Alerts table
CREATE TABLE public.price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  condition text NOT NULL CHECK (condition IN ('above', 'below')),
  target_price numeric NOT NULL,
  triggered boolean DEFAULT false,
  triggered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts" ON public.price_alerts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alerts" ON public.price_alerts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts" ON public.price_alerts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts" ON public.price_alerts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
