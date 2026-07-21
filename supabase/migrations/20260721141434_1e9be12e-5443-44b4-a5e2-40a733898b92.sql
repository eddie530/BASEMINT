
CREATE TABLE public.usdc_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tx_hash TEXT NOT NULL UNIQUE,
  chain_id INTEGER NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  amount_usdc NUMERIC NOT NULL,
  plan TEXT NOT NULL,
  block_number BIGINT,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_usdc_payments_user_id ON public.usdc_payments(user_id);

GRANT SELECT ON public.usdc_payments TO authenticated;
GRANT ALL ON public.usdc_payments TO service_role;

ALTER TABLE public.usdc_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own usdc payments"
  ON public.usdc_payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
