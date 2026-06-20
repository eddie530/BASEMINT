
-- Drop public SELECT policies; server functions use the service role and bypass RLS.
DROP POLICY IF EXISTS daily_checkins_public_read ON public.daily_checkins;
DROP POLICY IF EXISTS point_events_public_read ON public.point_events;
DROP POLICY IF EXISTS quest_progress_public_read ON public.quest_progress;
DROP POLICY IF EXISTS point_balances_public_read ON public.point_balances;
DROP POLICY IF EXISTS referral_codes_public_read ON public.referral_codes;
DROP POLICY IF EXISTS referral_events_public_read ON public.referral_events;

-- Revoke direct Data API SELECT access; only service_role can read these tables now.
REVOKE SELECT ON public.daily_checkins  FROM anon, authenticated;
REVOKE SELECT ON public.point_events    FROM anon, authenticated;
REVOKE SELECT ON public.quest_progress  FROM anon, authenticated;
REVOKE SELECT ON public.point_balances  FROM anon, authenticated;
REVOKE SELECT ON public.referral_codes  FROM anon, authenticated;
REVOKE SELECT ON public.referral_events FROM anon, authenticated;
REVOKE SELECT ON public.page_events     FROM anon, authenticated;

-- page_events has no policies and no Data API grants — service_role only.
-- Quests table stays publicly readable (no PII, used for the quest list).
