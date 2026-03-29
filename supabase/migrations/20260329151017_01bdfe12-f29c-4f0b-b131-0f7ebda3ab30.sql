-- Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  plan text DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'premium')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- User roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all roles
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  
  IF NEW.email = 'jashan123preetsingh@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Feature locks table
CREATE TABLE public.feature_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text UNIQUE NOT NULL,
  feature_name text NOT NULL,
  description text,
  required_plan text DEFAULT 'pro' CHECK (required_plan IN ('pro', 'premium')),
  is_locked boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.feature_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view feature locks" ON public.feature_locks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage feature locks" ON public.feature_locks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.feature_locks (feature_key, feature_name, description, required_plan) VALUES
  ('ai_assistant', 'AI Assistant', 'AI-powered stock analysis and chat', 'pro'),
  ('oi_analysis', 'OI Analysis', 'Open Interest analysis with live data', 'pro'),
  ('options_chain', 'Options Chain', 'Real-time options chain data', 'pro'),
  ('iv_surface', 'IV Surface', 'Implied Volatility surface visualization', 'premium'),
  ('advanced_scanner', 'Advanced Scanner', 'ORB, EMA and advanced scan strategies', 'pro'),
  ('export_data', 'Export Data', 'Export data to CSV/Excel', 'premium'),
  ('market_brief', 'Market Brief', 'AI-generated daily market brief', 'pro');