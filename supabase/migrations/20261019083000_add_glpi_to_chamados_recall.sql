-- Migration: Adicionar campo GLPI na tabela chamados_recall e habilitar Importação NF para Recall
ALTER TABLE public.chamados_recall ADD COLUMN IF NOT EXISTS glpi TEXT;

-- Habilita a situação 'Importação NF' para a tabela de recall no catálogo de tarefas
UPDATE public.tarefas_catalogo 
SET aplica_recall = true 
WHERE lower(trim(nome)) = 'importação nf' OR lower(trim(nome)) = 'importacao nf';
