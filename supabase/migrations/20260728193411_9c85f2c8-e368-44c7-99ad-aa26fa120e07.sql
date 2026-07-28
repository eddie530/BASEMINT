REVOKE ALL ON public.referral_codes FROM anon, authenticated;
GRANT ALL ON public.referral_codes TO service_role;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS referral_codes_deny_all ON public.referral_codes;
CREATE POLICY referral_codes_deny_all ON public.referral_codes AS RESTRICTIVE TO anon, authenticated USING (false) WITH CHECK (false);