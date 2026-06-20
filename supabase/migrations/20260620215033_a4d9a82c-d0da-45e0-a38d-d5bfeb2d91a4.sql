
-- 1) point_events
CREATE TABLE public.point_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  kind text NOT NULL,
  points integer NOT NULL,
  ref_key text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX point_events_idem ON public.point_events (wallet_address, kind, ref_key) WHERE ref_key IS NOT NULL;
CREATE INDEX point_events_wallet_created ON public.point_events (wallet_address, created_at DESC);
GRANT SELECT ON public.point_events TO anon, authenticated;
GRANT ALL ON public.point_events TO service_role;
ALTER TABLE public.point_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY point_events_public_read ON public.point_events FOR SELECT USING (true);

-- 2) point_balances
CREATE TABLE public.point_balances (
  wallet_address text PRIMARY KEY,
  total integer NOT NULL DEFAULT 0,
  lifetime integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX point_balances_total ON public.point_balances (total DESC);
GRANT SELECT ON public.point_balances TO anon, authenticated;
GRANT ALL ON public.point_balances TO service_role;
ALTER TABLE public.point_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY point_balances_public_read ON public.point_balances FOR SELECT USING (true);

-- 3) daily_checkins
CREATE TABLE public.daily_checkins (
  wallet_address text NOT NULL,
  checkin_date date NOT NULL,
  streak integer NOT NULL DEFAULT 1,
  points_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (wallet_address, checkin_date)
);
GRANT SELECT ON public.daily_checkins TO anon, authenticated;
GRANT ALL ON public.daily_checkins TO service_role;
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY daily_checkins_public_read ON public.daily_checkins FOR SELECT USING (true);

-- 4) quests
CREATE TABLE public.quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  goal_kind text NOT NULL,
  goal_count integer NOT NULL DEFAULT 1,
  points_reward integer NOT NULL,
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quests TO anon, authenticated;
GRANT ALL ON public.quests TO service_role;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY quests_public_read ON public.quests FOR SELECT USING (true);

-- 5) quest_progress
CREATE TABLE public.quest_progress (
  wallet_address text NOT NULL,
  quest_id uuid NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  progress integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (wallet_address, quest_id)
);
CREATE INDEX quest_progress_wallet ON public.quest_progress (wallet_address);
GRANT SELECT ON public.quest_progress TO anon, authenticated;
GRANT ALL ON public.quest_progress TO service_role;
ALTER TABLE public.quest_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY quest_progress_public_read ON public.quest_progress FOR SELECT USING (true);

-- 6) Trigger: maintain point_balances on point_events insert
CREATE OR REPLACE FUNCTION public.apply_point_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.point_balances (wallet_address, total, lifetime, updated_at)
  VALUES (NEW.wallet_address, NEW.points, GREATEST(NEW.points, 0), now())
  ON CONFLICT (wallet_address) DO UPDATE
    SET total = public.point_balances.total + NEW.points,
        lifetime = public.point_balances.lifetime + GREATEST(NEW.points, 0),
        updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER point_events_apply
AFTER INSERT ON public.point_events
FOR EACH ROW EXECUTE FUNCTION public.apply_point_event();

-- 7) Seed starter quests
INSERT INTO public.quests (slug, title, description, goal_kind, goal_count, points_reward) VALUES
  ('first-coin', 'Launch your first coin', 'Create a coin on Basemint to earn a launch bonus.', 'create_coin', 1, 250),
  ('buy-three', 'Collect 3 coins', 'Buy or mint 3 different coins from the feed.', 'buy_coin', 3, 150),
  ('refer-friend', 'Refer a friend', 'Get one referral to mint via your link.', 'referral_mint', 1, 200),
  ('week-streak', '7-day check-in streak', 'Claim your daily check-in 7 days in a row.', 'checkin_streak', 7, 300);
