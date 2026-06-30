DROP POLICY IF EXISTS cdp_wallets_public_read ON public.cdp_wallets;
REVOKE ALL ON public.cdp_wallets FROM anon, authenticated;
GRANT ALL ON public.cdp_wallets TO service_role;
ALTER TABLE public.cdp_wallets ENABLE ROW LEVEL SECURITY;