DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;