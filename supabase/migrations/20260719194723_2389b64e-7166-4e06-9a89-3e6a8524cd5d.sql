-- Restrict SECURITY DEFINER function execution to service_role only
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.apply_point_event() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_point_event() TO service_role;

-- Remove sensitive billing table from realtime broadcast; clients can refetch via server functions
ALTER PUBLICATION supabase_realtime DROP TABLE public.subscriptions;