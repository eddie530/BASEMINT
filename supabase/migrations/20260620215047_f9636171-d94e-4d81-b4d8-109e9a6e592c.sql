
REVOKE EXECUTE ON FUNCTION public.apply_point_event() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_point_event() TO service_role;
