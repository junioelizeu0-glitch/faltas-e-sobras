
-- Drop all public/anon permissive policies. Server functions now use service_role
-- (via getServerSupabase) after the site-gate cookie check, which bypasses RLS.
-- The Data API is no longer directly exposed to anon/authenticated for these tables.

DROP POLICY IF EXISTS "audit_log open" ON public.audit_log;
DROP POLICY IF EXISTS app_gate_all ON public.chamados_etapas;
DROP POLICY IF EXISTS app_gate_all ON public.chamados_faltas;
DROP POLICY IF EXISTS app_gate_all ON public.chamados_referencias;
DROP POLICY IF EXISTS app_gate_all ON public.conferentes;
DROP POLICY IF EXISTS app_gate_all ON public.lojas;
DROP POLICY IF EXISTS app_gate_all ON public.motivos;
DROP POLICY IF EXISTS app_gate_all ON public.produtos;
DROP POLICY IF EXISTS app_gate_all ON public.tarefas_catalogo;
DROP POLICY IF EXISTS app_gate_all ON public.transportadoras;

-- Ensure RLS stays enabled (deny-by-default for anon/authenticated).
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamados_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamados_faltas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamados_referencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conferentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transportadoras ENABLE ROW LEVEL SECURITY;

-- Revoke Data API access from anon/authenticated on all app tables; keep service_role.
REVOKE ALL ON public.audit_log FROM anon, authenticated;
REVOKE ALL ON public.chamados_etapas FROM anon, authenticated;
REVOKE ALL ON public.chamados_faltas FROM anon, authenticated;
REVOKE ALL ON public.chamados_referencias FROM anon, authenticated;
REVOKE ALL ON public.conferentes FROM anon, authenticated;
REVOKE ALL ON public.lojas FROM anon, authenticated;
REVOKE ALL ON public.motivos FROM anon, authenticated;
REVOKE ALL ON public.produtos FROM anon, authenticated;
REVOKE ALL ON public.tarefas_catalogo FROM anon, authenticated;
REVOKE ALL ON public.transportadoras FROM anon, authenticated;

GRANT ALL ON public.audit_log TO service_role;
GRANT ALL ON public.chamados_etapas TO service_role;
GRANT ALL ON public.chamados_faltas TO service_role;
GRANT ALL ON public.chamados_referencias TO service_role;
GRANT ALL ON public.conferentes TO service_role;
GRANT ALL ON public.lojas TO service_role;
GRANT ALL ON public.motivos TO service_role;
GRANT ALL ON public.produtos TO service_role;
GRANT ALL ON public.tarefas_catalogo TO service_role;
GRANT ALL ON public.transportadoras TO service_role;

-- SECURITY DEFINER function aiiliana_run_sql must not be callable by anon/authenticated
-- via PostgREST. Server calls it through the service_role client.
REVOKE ALL ON FUNCTION public.aiiliana_run_sql(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aiiliana_run_sql(text) TO service_role;
