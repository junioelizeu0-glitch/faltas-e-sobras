INSERT INTO public.tarefas_catalogo (nome, dias_uteis)
SELECT v.nome, v.dias FROM (VALUES ('Falta Aprovada', 1), ('Falta Recusada', 1)) AS v(nome, dias)
WHERE NOT EXISTS (SELECT 1 FROM public.tarefas_catalogo t WHERE lower(t.nome) = lower(v.nome));