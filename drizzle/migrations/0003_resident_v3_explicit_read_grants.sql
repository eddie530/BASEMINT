REVOKE ALL ON public.resident_simulation_orders, public.resident_ai_usage, public.resident_admin_roles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.resident_simulation_orders, public.resident_ai_usage, public.resident_admin_roles TO authenticated;
GRANT ALL ON public.resident_simulation_orders, public.resident_ai_usage, public.resident_admin_roles TO service_role;