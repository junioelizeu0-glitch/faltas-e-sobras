-- Adiciona coluna aplica_recall na tabela tarefas_catalogo
ALTER TABLE public.tarefas_catalogo ADD COLUMN IF NOT EXISTS aplica_recall boolean NOT NULL DEFAULT false;
