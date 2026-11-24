-- =========================================================================
-- SISTEMA FALTAS & SOBRAS - VIEWS DO DASHBOARD GERENCIAL
-- Banco de Dados: Supabase (PostgreSQL)
-- Objetivo: Fornecer agregações e KPIs consolidados para a rota /dashboard
-- =========================================================================

-- 1. View Consolidada de Chamados (Faltas e Sobras + Recall)
-- Unifica as tabelas com regras de negócio de "em_aberto", "dias_aberto" e "sla_estourado"
CREATE OR REPLACE VIEW vw_chamados_consolidado AS
SELECT 
  'faltas'::text AS modulo,
  'Faltas e Sobras'::text AS modulo_label,
  id,
  chamado,
  loja,
  tipo,
  cd,
  situacao AS tarefa_atual,
  status_chamado,
  dt_abertura,
  dt_finalizacao,
  COALESCE(valor, 0)::numeric AS valor,
  CASE 
    WHEN dt_finalizacao IS NULL OR TRIM(dt_finalizacao::text) = '' OR TRIM(dt_finalizacao::text) = '-' THEN true 
    ELSE false 
  END AS em_aberto,
  (CURRENT_DATE - dt_abertura)::int AS dias_aberto,
  CASE 
    WHEN dt_finalizacao IS NOT NULL AND TRIM(dt_finalizacao::text) != '' AND TRIM(dt_finalizacao::text) != '-' 
    THEN (dt_finalizacao - dt_abertura)::int 
    ELSE NULL 
  END AS dias_resolucao,
  CASE 
    WHEN (dt_finalizacao IS NULL OR TRIM(dt_finalizacao::text) = '' OR TRIM(dt_finalizacao::text) = '-') 
         AND (CURRENT_DATE - dt_abertura) > 60 THEN true 
    ELSE false 
  END AS sla_estourado,
  CASE 
    WHEN (dt_finalizacao IS NOT NULL AND TRIM(dt_finalizacao::text) != '' AND TRIM(dt_finalizacao::text) != '-') 
         AND (dt_finalizacao - dt_abertura) <= 60 THEN true 
    ELSE false 
  END AS resolvido_no_prazo
FROM chamados_faltas

UNION ALL

SELECT 
  'recall'::text AS modulo,
  'Recall'::text AS modulo_label,
  id,
  chamado,
  loja,
  tipo,
  cd,
  situacao AS tarefa_atual,
  status_chamado,
  dt_abertura,
  dt_finalizacao,
  COALESCE(valor, 0)::numeric AS valor,
  CASE 
    WHEN dt_finalizacao IS NULL OR TRIM(dt_finalizacao::text) = '' OR TRIM(dt_finalizacao::text) = '-' THEN true 
    ELSE false 
  END AS em_aberto,
  (CURRENT_DATE - dt_abertura)::int AS dias_aberto,
  CASE 
    WHEN dt_finalizacao IS NOT NULL AND TRIM(dt_finalizacao::text) != '' AND TRIM(dt_finalizacao::text) != '-' 
    THEN (dt_finalizacao - dt_abertura)::int 
    ELSE NULL 
  END AS dias_resolucao,
  CASE 
    WHEN (dt_finalizacao IS NULL OR TRIM(dt_finalizacao::text) = '' OR TRIM(dt_finalizacao::text) = '-') 
         AND (CURRENT_DATE - dt_abertura) > 60 THEN true 
    ELSE false 
  END AS sla_estourado,
  CASE 
    WHEN (dt_finalizacao IS NOT NULL AND TRIM(dt_finalizacao::text) != '' AND TRIM(dt_finalizacao::text) != '-') 
         AND (dt_finalizacao - dt_abertura) <= 60 THEN true 
    ELSE false 
  END AS resolvido_no_prazo
FROM chamados_recall;


-- 2. View de Indicadores Principais (KPIs Globais)
CREATE OR REPLACE VIEW vw_dashboard_kpis AS
WITH mes_stats AS (
  SELECT 
    COUNT(*) FILTER (WHERE dt_abertura >= DATE_TRUNC('month', CURRENT_DATE))::int AS abertos_mes_atual,
    COUNT(*) FILTER (
      WHERE dt_abertura >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') 
        AND dt_abertura < DATE_TRUNC('month', CURRENT_DATE)
    )::int AS abertos_mes_anterior
  FROM vw_chamados_consolidado
)
SELECT 
  COUNT(*)::int AS total_chamados,
  COUNT(*) FILTER (WHERE em_aberto)::int AS total_abertos,
  COUNT(*) FILTER (WHERE NOT em_aberto)::int AS total_concluidos,
  COALESCE(SUM(valor) FILTER (WHERE em_aberto), 0)::numeric AS valor_total_aberto,
  COUNT(*) FILTER (WHERE sla_estourado)::int AS total_sla_estourado,
  ROUND(
    (COUNT(*) FILTER (WHERE sla_estourado)::numeric / NULLIF(COUNT(*) FILTER (WHERE em_aberto), 0)) * 100, 
    1
  ) AS perc_sla_estourado,
  COUNT(*) FILTER (
    WHERE NOT em_aberto 
      AND dt_finalizacao >= DATE_TRUNC('month', CURRENT_DATE)::date
  )::int AS concluidos_mes_atual,
  ROUND(AVG(dias_resolucao) FILTER (WHERE NOT em_aberto), 1) AS tempo_medio_resolucao_dias,
  ROUND(
    (COUNT(*) FILTER (WHERE resolvido_no_prazo)::numeric / NULLIF(COUNT(*) FILTER (WHERE NOT em_aberto), 0)) * 100, 
    1
  ) AS perc_dentro_do_prazo,
  (SELECT abertos_mes_atual FROM mes_stats) AS novos_mes_atual,
  (SELECT abertos_mes_anterior FROM mes_stats) AS novos_mes_anterior,
  CASE 
    WHEN (SELECT abertos_mes_anterior FROM mes_stats) = 0 THEN 0 
    ELSE ROUND((((SELECT abertos_mes_atual FROM mes_stats) - (SELECT abertos_mes_anterior FROM mes_stats))::numeric / (SELECT abertos_mes_anterior FROM mes_stats)::numeric) * 100, 1)
  END AS variacao_vs_mes_anterior
FROM vw_chamados_consolidado;


-- 3. View de Evolução Mensal (Últimos 12 Meses: Abertos vs Concluídos)
CREATE OR REPLACE VIEW vw_dashboard_mensal AS
WITH meses AS (
  SELECT generate_series(
    DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months'),
    DATE_TRUNC('month', CURRENT_DATE),
    INTERVAL '1 month'
  )::date AS mes
),
abertos_mes AS (
  SELECT DATE_TRUNC('month', dt_abertura)::date AS mes, COUNT(*)::int AS qtd_abertos
  FROM vw_chamados_consolidado
  WHERE dt_abertura >= (CURRENT_DATE - INTERVAL '11 months')
  GROUP BY 1
),
concluidos_mes AS (
  SELECT DATE_TRUNC('month', dt_finalizacao)::date AS mes, COUNT(*)::int AS qtd_concluidos
  FROM vw_chamados_consolidado
  WHERE NOT em_aberto AND dt_finalizacao >= (CURRENT_DATE - INTERVAL '11 months')
  GROUP BY 1
)
SELECT 
  m.mes::text AS mes_key,
  TO_CHAR(m.mes, 'Mon/YY') AS mes_label,
  COALESCE(a.qtd_abertos, 0) AS abertos,
  COALESCE(c.qtd_concluidos, 0) AS concluidos
FROM meses m
LEFT JOIN abertos_mes a ON a.mes = m.mes
LEFT JOIN concluidos_mes c ON c.mes = m.mes
ORDER BY m.mes ASC;


-- 4. View de Distribuição por Faixa de Idade (Chamados em Aberto)
CREATE OR REPLACE VIEW vw_dashboard_faixas_idade AS
SELECT 
  COUNT(*) FILTER (WHERE dias_aberto BETWEEN 0 AND 15)::int AS faixa_0_15,
  COUNT(*) FILTER (WHERE dias_aberto BETWEEN 16 AND 30)::int AS faixa_16_30,
  COUNT(*) FILTER (WHERE dias_aberto BETWEEN 31 AND 60)::int AS faixa_31_60,
  COUNT(*) FILTER (WHERE dias_aberto > 60)::int AS faixa_60_plus
FROM vw_chamados_consolidado
WHERE em_aberto;


-- 5. View de Chamados em Aberto por Tarefa Atual
CREATE OR REPLACE VIEW vw_dashboard_tarefas AS
SELECT 
  COALESCE(NULLIF(TRIM(tarefa_atual), ''), 'Não informada') AS tarefa,
  COUNT(*)::int AS total,
  COALESCE(SUM(valor), 0)::numeric AS valor_total
FROM vw_chamados_consolidado
WHERE em_aberto
GROUP BY 1
ORDER BY total DESC;


-- 6. View de Top Lojas por Valor em Aberto
CREATE OR REPLACE VIEW vw_dashboard_top_lojas AS
SELECT 
  loja,
  MAX(tipo) AS tipo,
  COUNT(*)::int AS total_chamados,
  COALESCE(SUM(valor), 0)::numeric AS valor_total
FROM vw_chamados_consolidado
WHERE em_aberto
GROUP BY loja
ORDER BY valor_total DESC
LIMIT 6;


-- 7. View de Chamados por Centro de Distribuição (CD)
CREATE OR REPLACE VIEW vw_dashboard_cds AS
SELECT 
  COALESCE(NULLIF(TRIM(cd), ''), 'Outros') AS cd,
  COUNT(*)::int AS total_chamados,
  COUNT(*) FILTER (WHERE em_aberto)::int AS total_abertos,
  COALESCE(SUM(valor) FILTER (WHERE em_aberto), 0)::numeric AS valor_aberto
FROM vw_chamados_consolidado
GROUP BY 1
ORDER BY total_chamados DESC;
