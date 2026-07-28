REVOKE ALL ON public.profile_contracts FROM anon, authenticated;
GRANT ALL ON public.profile_contracts TO service_role;
ALTER TABLE public.profile_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profile_contracts_deny_all ON public.profile_contracts;
CREATE POLICY profile_contracts_deny_all ON public.profile_contracts
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);