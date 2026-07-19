CREATE TABLE public.subscription_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_subscription_id text NOT NULL,
  stripe_customer_id text,
  event_type text NOT NULL,
  previous_status text,
  new_status text,
  previous_price_id text,
  new_price_id text,
  cancel_at_period_end boolean,
  current_period_end timestamptz,
  environment text NOT NULL,
  raw_event jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sub_audit_user ON public.subscription_audit_log(user_id);
CREATE INDEX idx_sub_audit_sub ON public.subscription_audit_log(stripe_subscription_id);
CREATE INDEX idx_sub_audit_created ON public.subscription_audit_log(created_at DESC);

GRANT ALL ON public.subscription_audit_log TO service_role;

ALTER TABLE public.subscription_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit log"
  ON public.subscription_audit_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
GRANT SELECT ON public.subscription_audit_log TO authenticated;