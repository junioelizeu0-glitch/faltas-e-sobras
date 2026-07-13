
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referencia TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '',
  descricao TEXT,
  nome_parceiro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT produtos_ref_cor_key UNIQUE (referencia, cor)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated, anon;
GRANT ALL ON public.produtos TO service_role;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_gate_all ON public.produtos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX produtos_referencia_idx ON public.produtos (referencia);
CREATE INDEX produtos_referencia_trgm ON public.produtos USING gin (referencia public.gin_trgm_ops);
CREATE INDEX produtos_descricao_trgm ON public.produtos USING gin (descricao public.gin_trgm_ops);
CREATE TRIGGER trg_produtos_updated BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.transportadoras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transportadoras TO authenticated, anon;
GRANT ALL ON public.transportadoras TO service_role;
ALTER TABLE public.transportadoras ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_gate_all ON public.transportadoras FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_transportadoras_updated BEFORE UPDATE ON public.transportadoras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.conferentes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conferentes TO authenticated, anon;
GRANT ALL ON public.conferentes TO service_role;
ALTER TABLE public.conferentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_gate_all ON public.conferentes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_conferentes_updated BEFORE UPDATE ON public.conferentes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.motivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.motivos TO authenticated, anon;
GRANT ALL ON public.motivos TO service_role;
ALTER TABLE public.motivos ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_gate_all ON public.motivos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_motivos_updated BEFORE UPDATE ON public.motivos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.chamados_referencias
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS quantidade NUMERIC;

INSERT INTO public.transportadoras (nome)
SELECT DISTINCT UPPER(TRIM(transportadora)) FROM public.chamados_faltas
WHERE transportadora IS NOT NULL AND TRIM(transportadora) <> ''
ON CONFLICT (nome) DO NOTHING;

INSERT INTO public.conferentes (nome)
SELECT DISTINCT UPPER(TRIM(conferente)) FROM public.chamados_faltas
WHERE conferente IS NOT NULL AND TRIM(conferente) <> ''
ON CONFLICT (nome) DO NOTHING;

INSERT INTO public.motivos (nome)
SELECT DISTINCT TRIM(motivo) FROM public.chamados_faltas
WHERE motivo IS NOT NULL AND TRIM(motivo) <> '' AND motivo <> '#N/D'
ON CONFLICT (nome) DO NOTHING;
