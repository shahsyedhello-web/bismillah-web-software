-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  first_name text,
  last_name text,
  full_name text,
  phone text,
  avatar_url text,
  preferred_language text DEFAULT 'English',
  notification_preferences jsonb DEFAULT '{"email_updates": true, "whatsapp_updates": true, "promotional_offers": true, "stock_alerts": true}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT
  TO authenticated USING (id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE
  TO authenticated USING (id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users delete own profile" ON public.profiles FOR DELETE
  TO authenticated USING (id = auth.uid() OR public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
