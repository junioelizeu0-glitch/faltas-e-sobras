-- Role somente-leitura para IA (AIliana)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'aiiliana_readonly') THEN
    CREATE ROLE aiiliana_readonly NOLOGIN;
  END IF;
END
$$;

-- Revoga qualquer privilégio herdado por engano
REVOKE ALL ON SCHEMA public FROM aiiliana_readonly;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM aiiliana_readonly;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM aiiliana_readonly;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM aiiliana_readonly;

-- Uso do schema (necessário para SELECT)
GRANT USAGE ON SCHEMA public TO aiiliana_readonly;

-- SELECT apenas nas tabelas de dados operacionais (não inclui audit_log)
GRANT SELECT ON public.chamados_faltas       TO aiiliana_readonly;
GRANT SELECT ON public.chamados_etapas       TO aiiliana_readonly;
GRANT SELECT ON public.chamados_referencias  TO aiiliana_readonly;
GRANT SELECT ON public.lojas                 TO aiiliana_readonly;
GRANT SELECT ON public.produtos              TO aiiliana_readonly;
GRANT SELECT ON public.transportadoras       TO aiiliana_readonly;
GRANT SELECT ON public.conferentes           TO aiiliana_readonly;
GRANT SELECT ON public.motivos               TO aiiliana_readonly;
GRANT SELECT ON public.tarefas_catalogo      TO aiiliana_readonly;

-- Garantir que novas tabelas criadas depois NÃO herdem privilégios automaticamente
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM aiiliana_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM aiiliana_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM aiiliana_readonly;