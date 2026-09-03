-- Criar tabela etapas_catalogo para cadastro separado de etapas do fluxo
CREATE TABLE IF NOT EXISTS public.etapas_catalogo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  dias_uteis integer NOT NULL DEFAULT 1,
  aplica_faltas boolean NOT NULL DEFAULT false,
  aplica_sobras boolean NOT NULL DEFAULT false,
  aplica_recall boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.etapas_catalogo TO service_role;
ALTER TABLE public.etapas_catalogo ENABLE ROW LEVEL SECURITY;
