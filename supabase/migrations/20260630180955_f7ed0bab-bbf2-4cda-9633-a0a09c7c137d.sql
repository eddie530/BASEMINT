
CREATE TABLE public.cdp_wallets (
  owner_wallet TEXT NOT NULL PRIMARY KEY,
  cdp_account_name TEXT NOT NULL UNIQUE,
  cdp_address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cdp_wallets TO anon, authenticated;
GRANT ALL ON public.cdp_wallets TO service_role;

ALTER TABLE public.cdp_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY cdp_wallets_public_read ON public.cdp_wallets
  FOR SELECT USING (true);
