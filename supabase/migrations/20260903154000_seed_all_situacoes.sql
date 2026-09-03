-- Seed de todas as situações padrão do sistema na tabela tarefas_catalogo se não existirem
INSERT INTO public.tarefas_catalogo (nome, dias_uteis, aplica_faltas, aplica_sobras, aplica_recall, ativo, ordem)
SELECT * FROM (VALUES
  ('Aguardando monitoramento', 2, true, true, true, true, 1),
  ('Aguardando NF Espelho', 3, true, false, false, true, 4),
  ('Validação NF Espelho', 4, true, false, false, true, 5),
  ('Aguardando NFD', 3, true, false, false, true, 6),
  ('Emitir NFD', 2, true, false, false, true, 7),
  ('Importação NF', 2, true, false, false, true, 8),
  ('Dados Bancários', 2, true, false, false, true, 9),
  ('Enviada Solicitação Provisionamento', 2, true, false, false, true, 10),
  ('Pendente Provisionamento Financeiro', 5, true, false, false, true, 11),
  ('Pagamento Provisionado', 5, true, false, false, true, 12),
  ('Chamado Aprovado', 1, true, true, true, true, 13),
  ('Chamado Recusado', 1, true, true, true, true, 14),
  ('Sem retorno (Finalizado)', 1, true, true, true, true, 15),
  ('Finalizar Chamado', 1, true, true, true, true, 16),
  ('Finalizado', 1, true, true, true, true, 17)
) AS v(nome, dias_uteis, aplica_faltas, aplica_sobras, aplica_recall, ativo, ordem)
WHERE NOT EXISTS (
  SELECT 1 FROM public.tarefas_catalogo t WHERE LOWER(TRIM(t.nome)) = LOWER(TRIM(v.nome))
);
