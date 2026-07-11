DROP POLICY IF EXISTS profile_contracts_public_read ON public.profile_contracts;
REVOKE SELECT ON public.profile_contracts FROM anon;
REVOKE SELECT ON public.profile_contracts FROM authenticated;