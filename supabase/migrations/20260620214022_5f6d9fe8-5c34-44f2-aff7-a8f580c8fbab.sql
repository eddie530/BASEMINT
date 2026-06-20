
-- Drop and rebuild with wallet-based identity
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.page_events CASCADE;
DROP TABLE IF EXISTS public.referral_events CASCADE;
DROP TABLE IF EXISTS public.referral_codes CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- profiles: keyed by lowercased wallet address
CREATE TABLE public.profiles (
  wallet_address TEXT PRIMARY KEY,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  twitter TEXT,
  farcaster TEXT,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
-- Writes happen via server route after wallet signature verification; service_role bypasses RLS.

-- referral_codes: code -> owner wallet
CREATE TABLE public.referral_codes (
  code TEXT PRIMARY KEY,
  owner_wallet TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX referral_codes_owner_idx ON public.referral_codes(owner_wallet);
GRANT SELECT ON public.referral_codes TO anon, authenticated;
GRANT ALL ON public.referral_codes TO service_role;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referral_codes_public_read" ON public.referral_codes FOR SELECT USING (true);

-- referral_events
CREATE TABLE public.referral_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL REFERENCES public.referral_codes(code) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('visit','connect','mint','trade')),
  coin_address TEXT,
  visitor_wallet TEXT,
  visitor_hash TEXT,
  value_wei NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX referral_events_code_idx ON public.referral_events(code, created_at DESC);
GRANT SELECT ON public.referral_events TO anon, authenticated;
GRANT ALL ON public.referral_events TO service_role;
ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;
-- Aggregate counts are public per code (no PII in this table beyond a salted hash and optional wallet).
CREATE POLICY "referral_events_public_read" ON public.referral_events FOR SELECT USING (true);

-- page_events: first-party analytics
CREATE TABLE public.page_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  path TEXT NOT NULL,
  referrer TEXT,
  ref_code TEXT,
  wallet_address TEXT,
  visitor_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX page_events_created_idx ON public.page_events(created_at DESC);
CREATE INDEX page_events_path_idx ON public.page_events(path);
GRANT SELECT ON public.page_events TO service_role;
GRANT ALL ON public.page_events TO service_role;
ALTER TABLE public.page_events ENABLE ROW LEVEL SECURITY;
-- No public read; reads happen via server fns using service_role.

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
  LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
