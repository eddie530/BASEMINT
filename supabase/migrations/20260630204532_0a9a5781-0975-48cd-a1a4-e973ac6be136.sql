ALTER TABLE public.cdp_wallets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cdp_wallets FROM anon, authenticated, PUBLIC;
GRANT ALL ON public.cdp_wallets TO service_role;
CREATE POLICY "cdp_wallets_deny_all" ON public.cdp_wallets FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);