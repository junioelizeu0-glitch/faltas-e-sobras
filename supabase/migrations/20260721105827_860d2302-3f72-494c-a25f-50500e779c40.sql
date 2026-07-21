GRANT ALL ON TABLE public.audit_log TO service_role;
GRANT ALL ON TABLE public.chamados_faltas TO service_role;
GRANT ALL ON TABLE public.chamados_etapas TO service_role;
GRANT ALL ON TABLE public.chamados_referencias TO service_role;
GRANT ALL ON TABLE public.lojas TO service_role;
GRANT ALL ON TABLE public.produtos TO service_role;
GRANT ALL ON TABLE public.tarefas_catalogo TO service_role;
GRANT ALL ON TABLE public.conferentes TO service_role;
GRANT ALL ON TABLE public.motivos TO service_role;
GRANT ALL ON TABLE public.transportadoras TO service_role;

GRANT USAGE, SELECT ON SEQUENCE public.audit_log_id_seq TO service_role;