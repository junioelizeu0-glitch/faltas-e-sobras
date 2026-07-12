
-- tarefas_catalogo
CREATE TABLE public.tarefas_catalogo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  dias_uteis integer NOT NULL DEFAULT 1,
  aplica_faltas boolean NOT NULL DEFAULT false,
  aplica_sobras boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.tarefas_catalogo TO service_role;
ALTER TABLE public.tarefas_catalogo ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_tarefas_catalogo_updated
  BEFORE UPDATE ON public.tarefas_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- chamados_referencias
CREATE TABLE public.chamados_referencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id uuid NOT NULL REFERENCES public.chamados_faltas(id) ON DELETE CASCADE,
  referencia text,
  cor text,
  tamanho text,
  fornecedor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chamados_referencias_chamado ON public.chamados_referencias(chamado_id);
GRANT ALL ON public.chamados_referencias TO service_role;
ALTER TABLE public.chamados_referencias ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_chamados_referencias_updated
  BEFORE UPDATE ON public.chamados_referencias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- chamados_etapas
CREATE TABLE public.chamados_etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id uuid NOT NULL REFERENCES public.chamados_faltas(id) ON DELETE CASCADE,
  tarefa_id uuid REFERENCES public.tarefas_catalogo(id) ON DELETE SET NULL,
  nome_tarefa text NOT NULL,
  dias_uteis_previsto integer,
  dt_inicio date,
  dt_fim date,
  dias_uteis_real integer,
  sla_status text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chamados_etapas_chamado ON public.chamados_etapas(chamado_id);
GRANT ALL ON public.chamados_etapas TO service_role;
ALTER TABLE public.chamados_etapas ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_chamados_etapas_updated
  BEFORE UPDATE ON public.chamados_etapas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed inicial de tarefas
INSERT INTO public.tarefas_catalogo (nome, dias_uteis, aplica_faltas, aplica_sobras, ordem) VALUES
  ('Aguardando Monitoramento', 2, true, true, 1),
  ('Em Análise Transportadora', 10, true, true, 2),
  ('Aguardando Aprovação', 15, true, true, 3),
  ('Aprovado', 5, true, true, 4),
  ('Pago', 30, true, false, 5),
  ('Recusado', 1, true, true, 6);
