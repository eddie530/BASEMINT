
-- profiles: wallet-keyed, anyone can read, owner edits
CREATE TABLE public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  wallet_address TEXT UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  twitter TEXT,
  farcaster TEXT,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_owner_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_owner_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- referral_codes: each user owns a code; public read by code
CREATE TABLE public.referral_codes (
  code TEXT PRIMARY KEY,
  owner_user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX referral_codes_owner_idx ON public.referral_codes(owner_user_id);
GRANT SELECT ON public.referral_codes TO anon;
GRANT SELECT, INSERT ON public.referral_codes TO authenticated;
GRANT ALL ON public.referral_codes TO service_role;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referral_codes_public_read" ON public.referral_codes FOR SELECT USING (true);
CREATE POLICY "referral_codes_owner_insert" ON public.referral_codes FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_user_id);

-- referral_events: inserted server-side
CREATE TABLE public.referral_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL REFERENCES public.referral_codes(code) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('visit','signup','mint','trade')),
  coin_address TEXT,
  value_wei NUMERIC,
  visitor_hash TEXT,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX referral_events_code_idx ON public.referral_events(code, created_at DESC);
GRANT SELECT ON public.referral_events TO authenticated;
GRANT ALL ON public.referral_events TO service_role;
ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referral_events_owner_read" ON public.referral_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.referral_codes rc WHERE rc.code = referral_events.code AND rc.owner_user_id = auth.uid()));

-- page_events: first-party analytics
CREATE TABLE public.page_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  path TEXT NOT NULL,
  referrer TEXT,
  ref_code TEXT,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  visitor_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX page_events_created_idx ON public.page_events(created_at DESC);
CREATE INDEX page_events_path_idx ON public.page_events(path);
GRANT SELECT ON public.page_events TO authenticated;
GRANT ALL ON public.page_events TO service_role;
ALTER TABLE public.page_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "page_events_self_read" ON public.page_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
  LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- generate referral code on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_code TEXT;
BEGIN
  new_code := lower(substring(replace(NEW.id::text,'-','') from 1 for 8));
  INSERT INTO public.profiles(user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.referral_codes(code, owner_user_id) VALUES (new_code, NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
