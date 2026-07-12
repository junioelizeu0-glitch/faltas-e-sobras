-- Fecha acesso público à tabela chamados_faltas.
-- O app passa a acessar apenas via server functions com service_role (que bypassa RLS).
DROP POLICY IF EXISTS "Public read chamados_faltas" ON public.chamados_faltas;
DROP POLICY IF EXISTS "Public insert chamados_faltas" ON public.chamados_faltas;
DROP POLICY IF EXISTS "Public update chamados_faltas" ON public.chamados_faltas;
DROP POLICY IF EXISTS "Public delete chamados_faltas" ON public.chamados_faltas;

-- Revoga privilégios de anon e authenticated no Data API.
REVOKE ALL ON public.chamados_faltas FROM anon;
REVOKE ALL ON public.chamados_faltas FROM authenticated;

-- Mantém acesso apenas para service_role (usado pelas server functions).
GRANT ALL ON public.chamados_faltas TO service_role;

-- RLS continua ligada; sem policies, nenhum acesso via chave pública é permitido.
ALTER TABLE public.chamados_faltas ENABLE ROW LEVEL SECURITY;