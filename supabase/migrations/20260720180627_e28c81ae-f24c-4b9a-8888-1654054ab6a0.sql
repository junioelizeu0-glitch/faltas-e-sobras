
REVOKE ALL ON FUNCTION public.log_changes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_changes() TO service_role;
