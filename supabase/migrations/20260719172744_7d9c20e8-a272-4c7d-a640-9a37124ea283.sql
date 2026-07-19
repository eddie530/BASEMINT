-- Add spin_win point kind support. point_events.kind is free-text so no
-- enum change is needed; this migration is a no-op DDL marker to document
-- that the app now writes rows with kind = 'spin_win'.
COMMENT ON COLUMN public.point_events.kind IS 'Free-text point event kind. Known values: create_coin, buy_coin, referral_signup, referral_mint, daily_checkin, share_cast, quest_complete, spin_win.';