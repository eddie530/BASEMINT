
CREATE TABLE public.user_entitlements (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  launch_credits int NOT NULL DEFAULT 0,
  booster_expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_entitlements TO authenticated;
GRANT ALL ON public.user_entitlements TO service_role;
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own entitlements read" ON public.user_entitlements FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.entitlement_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('launch_credit', 'points_booster')),
  source text NOT NULL CHECK (source IN ('stripe', 'commerce')),
  source_ref text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, source_ref)
);
CREATE INDEX entitlement_grants_user ON public.entitlement_grants(user_id, created_at DESC);
GRANT SELECT ON public.entitlement_grants TO authenticated;
GRANT ALL ON public.entitlement_grants TO service_role;
ALTER TABLE public.entitlement_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own grants read" ON public.entitlement_grants FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Atomically consume one launch credit for the calling user.
CREATE OR REPLACE FUNCTION public.consume_launch_credit(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE consumed boolean;
BEGIN
  UPDATE public.user_entitlements
     SET launch_credits = launch_credits - 1, updated_at = now()
   WHERE user_id = _user_id AND launch_credits > 0
  RETURNING true INTO consumed;
  RETURN COALESCE(consumed, false);
END;
$$;
REVOKE ALL ON FUNCTION public.consume_launch_credit(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_launch_credit(uuid) TO service_role;
