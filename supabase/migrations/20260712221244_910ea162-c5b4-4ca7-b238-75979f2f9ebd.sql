
CREATE TABLE public.chamados_faltas (
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chamados_faltas TO anon, authenticated;
GRANT ALL ON public.chamados_faltas TO service_role;

ALTER TABLE public.chamados_faltas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read chamados_faltas" ON public.chamados_faltas FOR SELECT USING (true);
CREATE POLICY "Public insert chamados_faltas" ON public.chamados_faltas FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update chamados_faltas" ON public.chamados_faltas FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete chamados_faltas" ON public.chamados_faltas FOR DELETE USING (true);

CREATE INDEX idx_chamados_faltas_dt_abertura ON public.chamados_faltas(dt_abertura);
CREATE INDEX idx_chamados_faltas_status ON public.chamados_faltas(status_chamado);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_chamados_faltas_updated_at BEFORE UPDATE ON public.chamados_faltas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
