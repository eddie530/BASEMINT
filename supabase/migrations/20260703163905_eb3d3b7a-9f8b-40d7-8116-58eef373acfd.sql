CREATE TABLE public.profile_contracts (
  wallet_address text NOT NULL,
  contract_address text NOT NULL,
  chain_id integer NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (wallet_address, chain_id, contract_address)
);

GRANT SELECT ON public.profile_contracts TO anon;
GRANT SELECT ON public.profile_contracts TO authenticated;
GRANT ALL ON public.profile_contracts TO service_role;

ALTER TABLE public.profile_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_contracts_public_read"
  ON public.profile_contracts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE INDEX profile_contracts_wallet_idx
  ON public.profile_contracts (lower(wallet_address));