
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos, public.transportadoras, public.conferentes, public.motivos TO sandbox_exec;
  END IF;
END $$;
