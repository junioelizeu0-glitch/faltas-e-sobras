
CREATE TABLE public.lojas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero text NOT NULL UNIQUE,
  cnpj text,
  razao_social text,
  banco text,
  agencia text,
  agencia_dig text,
  conta text,
  conta_dig text,
  tipo_conta text,
  pix text,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lojas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lojas TO anon;
GRANT ALL ON public.lojas TO service_role;

ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_gate_all ON public.lojas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_lojas_updated_at BEFORE UPDATE ON public.lojas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
