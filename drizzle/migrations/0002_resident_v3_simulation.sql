CREATE TABLE public.resident_simulation_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 request_id uuid NOT NULL, amount_usdc numeric NOT NULL DEFAULT 4.99 CHECK(amount_usdc=4.99),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed')),
 expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
 UNIQUE(user_id,request_id)
);
GRANT SELECT ON public.resident_simulation_orders TO authenticated;
GRANT ALL ON public.resident_simulation_orders TO service_role;
ALTER TABLE public.resident_simulation_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY resident_orders_read_own ON public.resident_simulation_orders FOR SELECT TO authenticated USING(auth.uid()=user_id);
CREATE TABLE public.resident_ai_usage (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 usage_day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
 tier text NOT NULL CHECK(tier IN ('free','pro')), status text NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','completed','failed')),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.resident_ai_usage TO authenticated;
GRANT ALL ON public.resident_ai_usage TO service_role;
ALTER TABLE public.resident_ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY resident_ai_read_own ON public.resident_ai_usage FOR SELECT TO authenticated USING(auth.uid()=user_id);
CREATE INDEX resident_ai_usage_user_day ON public.resident_ai_usage(user_id,usage_day);
CREATE TABLE public.resident_admin_roles (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 role text NOT NULL DEFAULT 'admin' CHECK(role='admin'), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.resident_admin_roles TO authenticated;
GRANT ALL ON public.resident_admin_roles TO service_role;
ALTER TABLE public.resident_admin_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY resident_admin_read_own ON public.resident_admin_roles FOR SELECT TO authenticated USING(auth.uid()=user_id);
CREATE FUNCTION public.resident_simulation_checkout(p_user uuid,p_request uuid,p_confirm boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE o public.resident_simulation_orders; expiry timestamptz;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('resident-v3:'||p_user::text,0));
 INSERT INTO public.resident_simulation_orders(user_id,request_id) VALUES(p_user,p_request) ON CONFLICT(user_id,request_id) DO NOTHING;
 SELECT * INTO o FROM public.resident_simulation_orders WHERE user_id=p_user AND request_id=p_request FOR UPDATE;
 IF p_confirm AND o.status='pending' THEN
  SELECT current_period_end INTO expiry FROM public.subscriptions WHERE stripe_subscription_id='resident-v3-sim:'||p_user::text AND current_period_end>now() AND status='active';
  IF expiry IS NOT NULL THEN RAISE EXCEPTION 'Simulated membership already active'; END IF;
  IF o.created_at < now()-interval '30 minutes' THEN RAISE EXCEPTION 'Checkout expired'; END IF;
  expiry := now()+interval '30 days';
  INSERT INTO public.subscriptions(user_id,stripe_subscription_id,stripe_customer_id,product_id,price_id,status,current_period_start,current_period_end,cancel_at_period_end,environment)
  VALUES(p_user,'resident-v3-sim:'||p_user::text,'simulation:'||p_user::text,'resident_pro','resident_pro_simulation_v3','active',now(),expiry,true,'resident_v3_simulation')
  ON CONFLICT(stripe_subscription_id) DO UPDATE SET status='active',current_period_start=now(),current_period_end=expiry,cancel_at_period_end=true,updated_at=now();
  UPDATE public.resident_simulation_orders SET status='completed',expires_at=expiry,completed_at=now() WHERE id=o.id RETURNING * INTO o;
 END IF;
 RETURN to_jsonb(o);
END $$;
REVOKE ALL ON FUNCTION public.resident_simulation_checkout(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.resident_simulation_checkout(uuid,uuid,boolean) TO service_role;
CREATE FUNCTION public.resident_reserve_ai(p_user uuid,p_request uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE pro boolean; used integer; lim integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('resident-ai:'||p_user::text,0));
 IF EXISTS(SELECT 1 FROM public.resident_ai_usage WHERE id=p_request) THEN RAISE EXCEPTION 'Request already used'; END IF;
 SELECT EXISTS(SELECT 1 FROM public.subscriptions WHERE user_id=p_user AND price_id IN ('resident_pro_monthly','resident_pro_monthly_v2','resident_pro_simulation_v3') AND status IN ('active','trialing','canceled') AND current_period_end>now() AND environment IN ('live','crypto','usdc','resident_v3_simulation')) INTO pro;
 lim:=CASE WHEN pro THEN 50 ELSE 5 END;
 SELECT count(*) INTO used FROM public.resident_ai_usage WHERE user_id=p_user AND usage_day=(now() AT TIME ZONE 'UTC')::date;
 IF used>=lim THEN RAISE EXCEPTION 'Daily AI limit reached'; END IF;
 INSERT INTO public.resident_ai_usage(id,user_id,tier) VALUES(p_request,p_user,CASE WHEN pro THEN 'pro' ELSE 'free' END);
 RETURN jsonb_build_object('tier',CASE WHEN pro THEN 'pro' ELSE 'free' END,'used',used+1,'limit',lim);
END $$;
REVOKE ALL ON FUNCTION public.resident_reserve_ai(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.resident_reserve_ai(uuid,uuid) TO service_role;