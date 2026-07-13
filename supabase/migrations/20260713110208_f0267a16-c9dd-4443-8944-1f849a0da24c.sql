
-- Allow anon/authenticated access via publishable key.
-- Application-level security is enforced by the server-side cookie gate (SITE_PASSWORD).

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chamados_faltas TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarefas_catalogo TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chamados_referencias TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chamados_etapas TO anon, authenticated;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['chamados_faltas','tarefas_catalogo','chamados_referencias','chamados_etapas'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "app_gate_all" ON public.%I', t);
    EXECUTE format('CREATE POLICY "app_gate_all" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;
