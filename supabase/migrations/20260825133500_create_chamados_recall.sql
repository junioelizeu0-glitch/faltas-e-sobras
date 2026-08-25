-- Migration: Criação das tabelas do módulo RECALL
CREATE TABLE IF NOT EXISTS public.chamados_recall (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chamado TEXT,
  loja TEXT,
  tipo TEXT,
  nf TEXT,
  dt_emissao DATE,
  valor NUMERIC,
  cd TEXT,
  situacao TEXT,
  dt_abertura DATE,
  dt_finalizacao DATE,
  dt_pagamento DATE,
  sla_status TEXT,
  status_pagamento TEXT,
  status_chamado TEXT,
  motivo TEXT,
  transportadora TEXT,
  conferente TEXT,
  periodo DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.chamados_recall TO service_role;
ALTER TABLE public.chamados_recall ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_chamados_recall_dt_abertura ON public.chamados_recall(dt_abertura);
CREATE INDEX IF NOT EXISTS idx_chamados_recall_status ON public.chamados_recall(status_chamado);

DROP TRIGGER IF EXISTS update_chamados_recall_updated_at ON public.chamados_recall;
CREATE TRIGGER update_chamados_recall_updated_at BEFORE UPDATE ON public.chamados_recall
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- chamados_recall_referencias
CREATE TABLE IF NOT EXISTS public.chamados_recall_referencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID NOT NULL REFERENCES public.chamados_recall(id) ON DELETE CASCADE,
  referencia TEXT,
  cor TEXT,
  tamanho TEXT,
  fornecedor TEXT,
  descricao TEXT,
  quantidade TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chamados_recall_referencias_chamado ON public.chamados_recall_referencias(chamado_id);
GRANT ALL ON public.chamados_recall_referencias TO service_role;
ALTER TABLE public.chamados_recall_referencias ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_chamados_recall_referencias_updated ON public.chamados_recall_referencias;
CREATE TRIGGER trg_chamados_recall_referencias_updated
  BEFORE UPDATE ON public.chamados_recall_referencias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- chamados_recall_etapas
CREATE TABLE IF NOT EXISTS public.chamados_recall_etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID NOT NULL REFERENCES public.chamados_recall(id) ON DELETE CASCADE,
  tarefa_id UUID REFERENCES public.tarefas_catalogo(id) ON DELETE SET NULL,
  nome_tarefa TEXT NOT NULL,
  dias_uteis_previsto INTEGER,
  dt_inicio DATE,
  dt_fim DATE,
  dias_uteis_real INTEGER,
  sla_status TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chamados_recall_etapas_chamado ON public.chamados_recall_etapas(chamado_id);
GRANT ALL ON public.chamados_recall_etapas TO service_role;
ALTER TABLE public.chamados_recall_etapas ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_chamados_recall_etapas_updated ON public.chamados_recall_etapas;
CREATE TRIGGER trg_chamados_recall_etapas_updated
  BEFORE UPDATE ON public.chamados_recall_etapas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Triggers de auditoria
DROP TRIGGER IF EXISTS trg_audit_recall ON public.chamados_recall;
CREATE TRIGGER trg_audit_recall AFTER INSERT OR UPDATE OR DELETE ON public.chamados_recall
FOR EACH ROW EXECUTE FUNCTION public.log_changes();

DROP TRIGGER IF EXISTS trg_audit_recall_etapas ON public.chamados_recall_etapas;
CREATE TRIGGER trg_audit_recall_etapas AFTER INSERT OR UPDATE OR DELETE ON public.chamados_recall_etapas
FOR EACH ROW EXECUTE FUNCTION public.log_changes();

DROP TRIGGER IF EXISTS trg_audit_recall_refs ON public.chamados_recall_referencias;
CREATE TRIGGER trg_audit_recall_refs AFTER INSERT OR UPDATE OR DELETE ON public.chamados_recall_referencias
FOR EACH ROW EXECUTE FUNCTION public.log_changes();
