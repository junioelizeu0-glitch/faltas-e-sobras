import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ModuloFiltro = "todos" | "faltas" | "recall";
export type PeriodoFiltro = "30d" | "6m" | "ano";

export type DashboardGerencialKPIs = {
  total_chamados_periodo: number;
  total_abertos: number;
  valor_total_aberto: number;
  total_sla_estourado: number;
  perc_sla_estourado: number;
  sla_ate_30d: number;
  sla_31_a_60d: number;
  sla_acima_60d: number;
  total_acima_45d: number;
  concluidos_mes_atual: number;
  concluidos_mes_anterior: number;
  tempo_medio_resolucao_dias: number;
  perc_dentro_do_prazo: number;
  ticket_medio: number;
  novos_mes_atual: number;
  novos_mes_anterior: number;
  variacao_vs_mes_anterior: number;
  variacao_valor_vs_mes_anterior: number;
  variacao_concluidos_vs_mes_anterior: number;
};

export type SparklinesData = {
  abertos: number[];
  valor: number[];
  sla: number[];
  tempo: number[];
  concluidos: number[];
  ticket: number[];
};

export type EvolucaoMensalItem = {
  mes_key: string;
  mes_label: string;
  abertos: number;
  concluidos: number;
};

export type DistribuicaoModuloItem = {
  modulo: string;
  label: string;
  total: number;
  abertos: number;
  valor_aberto: number;
  percentual: number;
  fill: string;
};

export type TarefaItem = {
  tarefa: string;
  total: number;
  valor_total: number;
  idade_media_dias: number;
};

export type TopLojaItem = {
  loja: string;
  tipo: string;
  total_chamados: number;
  valor_total: number;
  percentual_do_max: number;
};

export type ChamadoCriticoItem = {
  id: string;
  modulo: "faltas" | "recall";
  modulo_label: string;
  chamado: string;
  loja: string;
  cd: string;
  tipo: string;
  tarefa_atual: string;
  status_chamado: string;
  dt_abertura: string;
  dias_aberto: number;
  valor: number;
};

export type AlertaItem = {
  tipo: "bad" | "warn" | "good";
  titulo: string;
  descricao: string;
};

export type DashboardGerencialPayload = {
  kpis: DashboardGerencialKPIs;
  sparklines: SparklinesData;
  evolucaoMensal: EvolucaoMensalItem[];
  distribuicaoModulos: DistribuicaoModuloItem[];
  tarefas: TarefaItem[];
  topLojas: TopLojaItem[];
  chamadosCriticos: ChamadoCriticoItem[];
  alertas: AlertaItem[];
  filtrosAtivos: {
    modulo: ModuloFiltro;
    periodo: PeriodoFiltro;
  };
  atualizadoEm: string;
};

const DashboardGerencialInput = z.object({
  modulo: z.enum(["todos", "faltas", "recall"]).default("todos"),
  periodo: z.enum(["30d", "6m", "ano"]).default("6m"),
});

export const fetchDashboardGerencialData = createServerFn({ method: "GET" })
  .validator((data?: unknown) => {
    return DashboardGerencialInput.parse(data || {});
  })
  .handler(async ({ data }): Promise<DashboardGerencialPayload> => {
    const { requireUnlockedSession } = await import("@/lib/gate.server");
    await requireUnlockedSession();

    const { getServerSupabase } = await import("@/integrations/supabase/server-client");
    const supabase = getServerSupabase();

    const modulo = data?.modulo || "todos";
    const periodo = data?.periodo || "6m";

    let moduloFilter = "";
    if (modulo === "faltas") moduloFilter = "AND modulo = 'faltas'";
    if (modulo === "recall") moduloFilter = "AND modulo = 'recall'";

    let periodoFilter = "";
    if (periodo === "30d") periodoFilter = "AND dt_abertura >= (CURRENT_DATE - INTERVAL '30 days')";
    if (periodo === "6m") periodoFilter = "AND dt_abertura >= (CURRENT_DATE - INTERVAL '6 months')";
    if (periodo === "ano") periodoFilter = "AND dt_abertura >= DATE_TRUNC('year', CURRENT_DATE)";

    // 1. SQL Principal de KPIs
    const sqlKPI = `
    WITH base AS (
      SELECT 
        'faltas' AS modulo, 'Faltas e Sobras' AS modulo_label,
        id, chamado, loja, tipo, cd, situacao, dt_abertura, dt_finalizacao,
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
        END AS dias_resolucao
      FROM chamados_faltas
      UNION ALL
      SELECT 
        'recall' AS modulo, 'Recall' AS modulo_label,
        id, chamado, loja, tipo, cd, situacao, dt_abertura, dt_finalizacao,
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
        END AS dias_resolucao
      FROM chamados_recall
    ),
    filtrado AS (
      SELECT * FROM base WHERE 1=1 ${moduloFilter} ${periodoFilter}
    ),
    abertos_atuais AS (
      SELECT * FROM base WHERE em_aberto ${moduloFilter}
    ),
    mes_stats AS (
      SELECT 
        COUNT(*) FILTER (WHERE dt_abertura >= DATE_TRUNC('month', CURRENT_DATE))::int AS abertos_mes_atual,
        COUNT(*) FILTER (
          WHERE dt_abertura >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') 
            AND dt_abertura < DATE_TRUNC('month', CURRENT_DATE)
        )::int AS abertos_mes_anterior,
        COALESCE(SUM(valor) FILTER (WHERE dt_abertura >= DATE_TRUNC('month', CURRENT_DATE)), 0)::numeric AS valor_mes_atual,
        COALESCE(SUM(valor) FILTER (
          WHERE dt_abertura >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') 
            AND dt_abertura < DATE_TRUNC('month', CURRENT_DATE)
        ), 0)::numeric AS valor_mes_anterior,
        COUNT(*) FILTER (
          WHERE dt_finalizacao >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') 
            AND dt_finalizacao < DATE_TRUNC('month', CURRENT_DATE)
        )::int AS concluidos_mes_anterior
      FROM base WHERE 1=1 ${moduloFilter}
    )
    SELECT 
      COUNT(*)::int AS total_chamados_periodo,
      (SELECT COUNT(*)::int FROM abertos_atuais) AS total_abertos,
      (SELECT COALESCE(SUM(valor), 0)::numeric FROM abertos_atuais) AS valor_total_aberto,
      (SELECT COUNT(*)::int FROM abertos_atuais WHERE dias_aberto > 60) AS total_sla_estourado,
      ROUND(
        ((SELECT COUNT(*)::numeric FROM abertos_atuais WHERE dias_aberto > 60) / 
         NULLIF((SELECT COUNT(*)::numeric FROM abertos_atuais), 0)) * 100, 1
      ) AS perc_sla_estourado,
      (SELECT COUNT(*)::int FROM abertos_atuais WHERE dias_aberto <= 30) AS sla_ate_30d,
      (SELECT COUNT(*)::int FROM abertos_atuais WHERE dias_aberto BETWEEN 31 AND 60) AS sla_31_a_60d,
      (SELECT COUNT(*)::int FROM abertos_atuais WHERE dias_aberto > 60) AS sla_acima_60d,
      (SELECT COUNT(*)::int FROM abertos_atuais WHERE dias_aberto > 45) AS total_acima_45d,
      COUNT(*) FILTER (
        WHERE NOT em_aberto 
          AND dt_finalizacao >= DATE_TRUNC('month', CURRENT_DATE)::date
      )::int AS concluidos_mes_atual,
      (SELECT concluidos_mes_anterior FROM mes_stats) AS concluidos_mes_anterior,
      ROUND(AVG(dias_resolucao) FILTER (WHERE NOT em_aberto), 1)::numeric AS tempo_medio_resolucao_dias,
      ROUND(
        (COUNT(*) FILTER (WHERE NOT em_aberto AND dias_resolucao <= 60)::numeric / 
         NULLIF(COUNT(*) FILTER (WHERE NOT em_aberto), 0)) * 100, 1
      ) AS perc_dentro_do_prazo,
      (SELECT abertos_mes_atual FROM mes_stats) AS novos_mes_atual,
      (SELECT abertos_mes_anterior FROM mes_stats) AS novos_mes_anterior,
      CASE 
        WHEN (SELECT abertos_mes_anterior FROM mes_stats) = 0 THEN 0 
        ELSE ROUND((((SELECT abertos_mes_atual FROM mes_stats) - (SELECT abertos_mes_anterior FROM mes_stats))::numeric / 
                    (SELECT abertos_mes_anterior FROM mes_stats)::numeric) * 100, 1)
      END AS variacao_vs_mes_anterior,
      CASE 
        WHEN (SELECT valor_mes_anterior FROM mes_stats) = 0 THEN 0 
        ELSE ROUND((((SELECT valor_mes_atual FROM mes_stats) - (SELECT valor_mes_anterior FROM mes_stats))::numeric / 
                    (SELECT valor_mes_anterior FROM mes_stats)::numeric) * 100, 1)
      END AS variacao_valor_vs_mes_anterior,
      CASE 
        WHEN (SELECT concluidos_mes_anterior FROM mes_stats) = 0 THEN 0 
        ELSE ROUND((((COUNT(*) FILTER (WHERE NOT em_aberto AND dt_finalizacao >= DATE_TRUNC('month', CURRENT_DATE)::date)) - (SELECT concluidos_mes_anterior FROM mes_stats))::numeric / 
                    (SELECT concluidos_mes_anterior FROM mes_stats)::numeric) * 100, 1)
      END AS variacao_concluidos_vs_mes_anterior
    FROM filtrado;
    `.trim();

    // 2. Query de Sparklines (Histórico dinâmico sensível ao período selecionado)
    const seriesGen = periodo === "30d"
      ? "generate_series(CURRENT_DATE - INTERVAL '25 days', CURRENT_DATE, INTERVAL '5 days')::date AS mes"
      : periodo === "ano"
      ? "generate_series(DATE_TRUNC('year', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE), INTERVAL '1 month')::date AS mes"
      : "generate_series(DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months'), DATE_TRUNC('month', CURRENT_DATE), INTERVAL '1 month')::date AS mes";

    const endOfPeriodOffset = periodo === "30d" ? "0 days" : "1 month - INTERVAL '1 day'";

    const sqlSpark = `
    WITH base AS (
      SELECT 'faltas' AS modulo, dt_abertura, dt_finalizacao, valor,
        CASE WHEN dt_finalizacao IS NULL OR TRIM(dt_finalizacao::text) = '' OR TRIM(dt_finalizacao::text) = '-' THEN true ELSE false END AS em_aberto,
        (CURRENT_DATE - dt_abertura)::int AS dias_aberto,
        CASE WHEN dt_finalizacao IS NOT NULL AND TRIM(dt_finalizacao::text) != '' AND TRIM(dt_finalizacao::text) != '-' THEN (dt_finalizacao - dt_abertura)::int ELSE NULL END AS dias_resolucao
      FROM chamados_faltas
      UNION ALL
      SELECT 'recall' AS modulo, dt_abertura, dt_finalizacao, valor,
        CASE WHEN dt_finalizacao IS NULL OR TRIM(dt_finalizacao::text) = '' OR TRIM(dt_finalizacao::text) = '-' THEN true ELSE false END AS em_aberto,
        (CURRENT_DATE - dt_abertura)::int AS dias_aberto,
        CASE WHEN dt_finalizacao IS NOT NULL AND TRIM(dt_finalizacao::text) != '' AND TRIM(dt_finalizacao::text) != '-' THEN (dt_finalizacao - dt_abertura)::int ELSE NULL END AS dias_resolucao
      FROM chamados_recall
    ),
    filtrado AS (
      SELECT * FROM base WHERE 1=1 ${moduloFilter}
    ),
    meses AS (
      SELECT ${seriesGen}
    )
    SELECT 
      m.mes::text AS mes_key,
      TO_CHAR(m.mes, 'DD/MM') AS mes_label,
      (SELECT COUNT(*)::int FROM filtrado f WHERE f.dt_abertura <= (m.mes + INTERVAL '${endOfPeriodOffset}')::date AND (f.dt_finalizacao IS NULL OR f.dt_finalizacao > (m.mes + INTERVAL '${endOfPeriodOffset}')::date)) AS abertos_no_ponto,
      (SELECT COALESCE(SUM(f.valor), 0)::numeric FROM filtrado f WHERE f.dt_abertura <= (m.mes + INTERVAL '${endOfPeriodOffset}')::date AND (f.dt_finalizacao IS NULL OR f.dt_finalizacao > (m.mes + INTERVAL '${endOfPeriodOffset}')::date)) AS valor_no_ponto,
      (SELECT COUNT(*)::int FROM filtrado f WHERE f.dt_abertura <= (m.mes + INTERVAL '${endOfPeriodOffset}')::date AND (f.dt_finalizacao IS NULL OR f.dt_finalizacao > (m.mes + INTERVAL '${endOfPeriodOffset}')::date) AND ((m.mes + INTERVAL '${endOfPeriodOffset}')::date - f.dt_abertura) > 60) AS sla_no_ponto,
      (SELECT ROUND(COALESCE(AVG(f.dias_resolucao), 0), 1)::numeric FROM filtrado f WHERE f.dt_finalizacao >= (m.mes - INTERVAL '15 days') AND f.dt_finalizacao <= (m.mes + INTERVAL '${endOfPeriodOffset}')::date) AS tempo_resolucao_mes,
      (SELECT COUNT(*)::int FROM filtrado f WHERE f.dt_finalizacao >= (m.mes - INTERVAL '15 days') AND f.dt_finalizacao <= (m.mes + INTERVAL '${endOfPeriodOffset}')::date) AS concluidos_mes,
      (SELECT ROUND(COALESCE(AVG(f.valor), 0), 0)::numeric FROM filtrado f WHERE f.dt_abertura <= (m.mes + INTERVAL '${endOfPeriodOffset}')::date AND (f.dt_finalizacao IS NULL OR f.dt_finalizacao > (m.mes + INTERVAL '${endOfPeriodOffset}')::date)) AS ticket_medio_ponto
    FROM meses m
    ORDER BY m.mes ASC;
    `.trim();

    // 3. Query de Evolução Mensal
    const mesesIntervalo = periodo === "30d" ? "3 months" : periodo === "6m" ? "5 months" : "11 months";
    const sqlMensal = `
    WITH base AS (
      SELECT 'faltas' AS modulo, dt_abertura, dt_finalizacao FROM chamados_faltas
      UNION ALL
      SELECT 'recall' AS modulo, dt_abertura, dt_finalizacao FROM chamados_recall
    ),
    filtrado AS (
      SELECT * FROM base WHERE 1=1 ${moduloFilter}
    ),
    meses AS (
      SELECT generate_series(
        DATE_TRUNC('month', CURRENT_DATE - INTERVAL '${mesesIntervalo}'),
        DATE_TRUNC('month', CURRENT_DATE),
        INTERVAL '1 month'
      )::date AS mes
    ),
    abertos_mes AS (
      SELECT DATE_TRUNC('month', dt_abertura)::date AS mes, COUNT(*)::int AS qtd
      FROM filtrado
      WHERE dt_abertura >= (CURRENT_DATE - INTERVAL '${mesesIntervalo}')
      GROUP BY 1
    ),
    concluidos_mes AS (
      SELECT DATE_TRUNC('month', dt_finalizacao)::date AS mes, COUNT(*)::int AS qtd
      FROM filtrado
      WHERE dt_finalizacao IS NOT NULL AND dt_finalizacao >= (CURRENT_DATE - INTERVAL '${mesesIntervalo}')
      GROUP BY 1
    )
    SELECT 
      m.mes::text AS mes_key,
      TO_CHAR(m.mes, 'Mon/YY') AS mes_label,
      COALESCE(a.qtd, 0)::int AS abertos,
      COALESCE(c.qtd, 0)::int AS concluidos
    FROM meses m
    LEFT JOIN abertos_mes a ON a.mes = m.mes
    LEFT JOIN concluidos_mes c ON c.mes = m.mes
    ORDER BY m.mes ASC;
    `.trim();

    // 4. Query de Distribuição por Módulo
    const sqlModulos = `
    WITH base AS (
      SELECT 
        'faltas' AS modulo,
        'Faltas e Sobras' AS label,
        valor,
        CASE WHEN dt_finalizacao IS NULL OR TRIM(dt_finalizacao::text) = '' OR TRIM(dt_finalizacao::text) = '-' THEN true ELSE false END AS em_aberto
      FROM chamados_faltas
      UNION ALL
      SELECT 
        'recall' AS modulo,
        'Recall' AS label,
        valor,
        CASE WHEN dt_finalizacao IS NULL OR TRIM(dt_finalizacao::text) = '' OR TRIM(dt_finalizacao::text) = '-' THEN true ELSE false END AS em_aberto
      FROM chamados_recall
    )
    SELECT 
      modulo,
      label,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE em_aberto)::int AS abertos,
      COALESCE(SUM(valor) FILTER (WHERE em_aberto), 0)::numeric AS valor_aberto
    FROM base
    GROUP BY modulo, label
    ORDER BY abertos DESC;
    `.trim();

    // 5. Query de Tarefas em Aberto (com idade média em dias)
    const sqlTarefas = `
    WITH base AS (
      SELECT 'faltas' AS modulo, situacao, valor, dt_abertura, dt_finalizacao FROM chamados_faltas
      UNION ALL
      SELECT 'recall' AS modulo, situacao, valor, dt_abertura, dt_finalizacao FROM chamados_recall
    )
    SELECT 
      COALESCE(NULLIF(TRIM(situacao), ''), 'Não informada') AS tarefa,
      COUNT(*)::int AS total,
      COALESCE(SUM(valor), 0)::numeric AS valor_total,
      ROUND(AVG((CURRENT_DATE - dt_abertura)))::int AS idade_media_dias
    FROM base
    WHERE (dt_finalizacao IS NULL OR TRIM(dt_finalizacao::text) = '' OR TRIM(dt_finalizacao::text) = '-') ${moduloFilter}
    GROUP BY 1
    ORDER BY total DESC
    LIMIT 6;
    `.trim();

    // 6. Query Top 6 Lojas
    const sqlLojas = `
    WITH base AS (
      SELECT 'faltas' AS modulo, loja, valor, tipo, dt_finalizacao FROM chamados_faltas
      UNION ALL
      SELECT 'recall' AS modulo, loja, valor, tipo, dt_finalizacao FROM chamados_recall
    )
    SELECT 
      loja,
      MAX(tipo) AS tipo,
      COUNT(*)::int AS total_chamados,
      COALESCE(SUM(valor), 0)::numeric AS valor_total
    FROM base
    WHERE (dt_finalizacao IS NULL OR TRIM(dt_finalizacao::text) = '' OR TRIM(dt_finalizacao::text) = '-') ${moduloFilter}
    GROUP BY loja
    ORDER BY valor_total DESC
    LIMIT 6;
    `.trim();

    // 7. Query Chamados Críticos (Mais antigos em aberto com SLA estourado ou próximo)
    const sqlCriticos = `
    WITH base AS (
      SELECT 'faltas' AS modulo, 'Faltas e Sobras' AS modulo_label, id, chamado, loja, cd, tipo, situacao AS tarefa_atual, status_chamado, dt_abertura, dt_finalizacao, valor FROM chamados_faltas
      UNION ALL
      SELECT 'recall' AS modulo, 'Recall' AS modulo_label, id, chamado, loja, cd, tipo, situacao AS tarefa_atual, status_chamado, dt_abertura, dt_finalizacao, valor FROM chamados_recall
    )
    SELECT 
      id,
      modulo,
      modulo_label,
      chamado,
      loja,
      COALESCE(cd, 'Geral') AS cd,
      COALESCE(tipo, 'Franquia') AS tipo,
      COALESCE(tarefa_atual, 'Em andamento') AS tarefa_atual,
      COALESCE(status_chamado, 'Aprovado') AS status_chamado,
      dt_abertura::text AS dt_abertura,
      (CURRENT_DATE - dt_abertura)::int AS dias_aberto,
      COALESCE(valor, 0)::numeric AS valor
    FROM base
    WHERE (dt_finalizacao IS NULL OR TRIM(dt_finalizacao::text) = '' OR TRIM(dt_finalizacao::text) = '-') ${moduloFilter}
    ORDER BY dt_abertura ASC
    LIMIT 10;
    `.trim();

    // Executar consultas concorrentes de forma ultra rápida
    const [
      { data: kpiData, error: kpiErr },
      { data: sparkData, error: sparkErr },
      { data: mensalData, error: mensalErr },
      { data: modulosData, error: modulosErr },
      { data: tarefasData, error: tarefasErr },
      { data: lojasData, error: lojasErr },
      { data: criticosData, error: criticosErr },
    ] = await Promise.all([
      supabase.rpc("aiiliana_run_sql", { sql: sqlKPI }),
      supabase.rpc("aiiliana_run_sql", { sql: sqlSpark }),
      supabase.rpc("aiiliana_run_sql", { sql: sqlMensal }),
      supabase.rpc("aiiliana_run_sql", { sql: sqlModulos }),
      supabase.rpc("aiiliana_run_sql", { sql: sqlTarefas }),
      supabase.rpc("aiiliana_run_sql", { sql: sqlLojas }),
      supabase.rpc("aiiliana_run_sql", { sql: sqlCriticos }),
    ]);

    if (kpiErr) console.warn("[DashboardGerencial] KPI error:", kpiErr);
    if (sparkErr) console.warn("[DashboardGerencial] Spark error:", sparkErr);
    if (mensalErr) console.warn("[DashboardGerencial] Mensal error:", mensalErr);

    const rawKpi = (kpiData && kpiData[0]) || {};
    const totalAbertos = Number(rawKpi.total_abertos || 0);
    const valorAberto = Number(rawKpi.valor_total_aberto || 0);

    const kpis: DashboardGerencialKPIs = {
      total_chamados_periodo: Number(rawKpi.total_chamados_periodo || 0),
      total_abertos: totalAbertos,
      valor_total_aberto: valorAberto,
      total_sla_estourado: Number(rawKpi.total_sla_estourado || 0),
      perc_sla_estourado: Number(rawKpi.perc_sla_estourado || 0),
      sla_ate_30d: Number(rawKpi.sla_ate_30d || 0),
      sla_31_a_60d: Number(rawKpi.sla_31_a_60d || 0),
      sla_acima_60d: Number(rawKpi.sla_acima_60d || 0),
      total_acima_45d: Number(rawKpi.total_acima_45d || 0),
      concluidos_mes_atual: Number(rawKpi.concluidos_mes_atual || 0),
      concluidos_mes_anterior: Number(rawKpi.concluidos_mes_anterior || 0),
      tempo_medio_resolucao_dias: Number(rawKpi.tempo_medio_resolucao_dias || 0),
      perc_dentro_do_prazo: Number(rawKpi.perc_dentro_do_prazo || 0),
      ticket_medio: totalAbertos > 0 ? Math.round(valorAberto / totalAbertos) : 0,
      novos_mes_atual: Number(rawKpi.novos_mes_atual || 0),
      novos_mes_anterior: Number(rawKpi.novos_mes_anterior || 0),
      variacao_vs_mes_anterior: Number(rawKpi.variacao_vs_mes_anterior || 0),
      variacao_valor_vs_mes_anterior: Number(rawKpi.variacao_valor_vs_mes_anterior || 0),
      variacao_concluidos_vs_mes_anterior: Number(rawKpi.variacao_concluidos_vs_mes_anterior || 0),
    };

    // Extrair sparklines
    const rawSpark = Array.isArray(sparkData) ? sparkData : [];
    const sparklines: SparklinesData = {
      abertos: rawSpark.map((s: any) => Number(s.abertos_no_ponto || 0)),
      valor: rawSpark.map((s: any) => Number(s.valor_no_ponto || 0)),
      sla: rawSpark.map((s: any) => Number(s.sla_no_ponto || 0)),
      tempo: rawSpark.map((s: any) => Number(s.tempo_resolucao_mes || 0)),
      concluidos: rawSpark.map((s: any) => Number(s.concluidos_mes || 0)),
      ticket: rawSpark.map((s: any) => Number(s.ticket_medio_ponto || 0)),
    };

    // Garantir pelo menos 2 pontos para sparkline
    if (sparklines.abertos.length < 2) sparklines.abertos = [totalAbertos, totalAbertos];
    if (sparklines.valor.length < 2) sparklines.valor = [valorAberto, valorAberto];
    if (sparklines.sla.length < 2) sparklines.sla = [kpis.total_sla_estourado, kpis.total_sla_estourado];
    if (sparklines.tempo.length < 2) sparklines.tempo = [kpis.tempo_medio_resolucao_dias, kpis.tempo_medio_resolucao_dias];
    if (sparklines.concluidos.length < 2) sparklines.concluidos = [kpis.concluidos_mes_atual, kpis.concluidos_mes_atual];
    if (sparklines.ticket.length < 2) sparklines.ticket = [kpis.ticket_medio, kpis.ticket_medio];

    // Formatar meses para a evolução mensal
    const mesesMesFormatado: Record<string, string> = {
      "Jan": "Jan", "Feb": "Fev", "Mar": "Mar", "Apr": "Abr", "May": "Mai", "Jun": "Jun",
      "Jul": "Jul", "Aug": "Ago", "Sep": "Set", "Oct": "Out", "Nov": "Nov", "Dec": "Dez"
    };

    const evolucaoMensal: EvolucaoMensalItem[] = Array.isArray(mensalData)
      ? mensalData.map((m: any) => {
          let label = String(m.mes_label || "");
          const [mon, yr] = label.split("/");
          if (mesesMesFormatado[mon]) {
            label = `${mesesMesFormatado[mon]}/${yr}`;
          }
          return {
            mes_key: String(m.mes_key),
            mes_label: label,
            abertos: Number(m.abertos || 0),
            concluidos: Number(m.concluidos || 0),
          };
        })
      : [];

    // Formatar Módulos Donut
    const totalAbertosTodos = (modulosData || []).reduce((acc: number, item: any) => acc + Number(item.abertos || 0), 0) || 1;
    const distribuicaoModulos: DistribuicaoModuloItem[] = Array.isArray(modulosData)
      ? modulosData.map((m: any) => ({
          modulo: String(m.modulo),
          label: String(m.label),
          total: Number(m.total || 0),
          abertos: Number(m.abertos || 0),
          valor_aberto: Number(m.valor_aberto || 0),
          percentual: Math.round((Number(m.abertos || 0) / totalAbertosTodos) * 100),
          fill: m.modulo === "recall" ? "#0b6b4b" : "#bfe3d2",
        }))
      : [];

    // Formatar Tarefas com idade média
    const tarefas: TarefaItem[] = Array.isArray(tarefasData)
      ? tarefasData.map((t: any) => ({
          tarefa: String(t.tarefa),
          total: Number(t.total || 0),
          valor_total: Number(t.valor_total || 0),
          idade_media_dias: Number(t.idade_media_dias || 0),
        }))
      : [];

    // Formatar Top Lojas
    const maxLojaValor = (lojasData || []).reduce((max: number, l: any) => Math.max(max, Number(l.valor_total || 0)), 0) || 1;
    const topLojas: TopLojaItem[] = Array.isArray(lojasData)
      ? lojasData.map((l: any) => ({
          loja: String(l.loja),
          tipo: String(l.tipo || "Franquia"),
          total_chamados: Number(l.total_chamados || 0),
          valor_total: Number(l.valor_total || 0),
          percentual_do_max: Math.round((Number(l.valor_total || 0) / maxLojaValor) * 100),
        }))
      : [];

    // Formatar Chamados Críticos
    const chamadosCriticos: ChamadoCriticoItem[] = Array.isArray(criticosData)
      ? criticosData.map((a: any) => ({
          id: String(a.id),
          modulo: a.modulo as "faltas" | "recall",
          modulo_label: String(a.modulo_label),
          chamado: String(a.chamado),
          loja: String(a.loja),
          cd: String(a.cd),
          tipo: String(a.tipo),
          tarefa_atual: String(a.tarefa_atual),
          status_chamado: String(a.status_chamado),
          dt_abertura: String(a.dt_abertura),
          dias_aberto: Number(a.dias_aberto || 0),
          valor: Number(a.valor || 0),
        }))
      : [];

    // Gerar Alertas Inteligentes com base nos dados reais
    const alertas: AlertaItem[] = [];

    // Alerta 1: SLA crítico
    if (kpis.total_sla_estourado > 0) {
      const topTarefaCritica = tarefas[0]?.tarefa || "fluxo geral";
      alertas.push({
        tipo: "bad",
        titulo: `${kpis.total_sla_estourado} chamados passaram de 60 dias`,
        descricao: `Maior concentração em "${topTarefaCritica}"`,
      });
    } else {
      alertas.push({
        tipo: "good",
        titulo: "SLA sob controle",
        descricao: "Nenhum chamado aberto com mais de 60 dias de atraso",
      });
    }

    // Alerta 2: Concentração de valor por loja
    if (topLojas.length > 0 && valorAberto > 0) {
      const top1 = topLojas[0];
      const percTop1 = Math.round((top1.valor_total / valorAberto) * 100);
      alertas.push({
        tipo: "warn",
        titulo: `${top1.loja} concentra ${percTop1}% do valor pendente`,
        descricao: `R$ ${(top1.valor_total / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mil em ${top1.total_chamados} chamados`,
      });
    }

    // Alerta 3: Desempenho / Concluídos
    if (kpis.variacao_concluidos_vs_mes_anterior >= 0) {
      alertas.push({
        tipo: "good",
        titulo: `Concluídos no mês: ${kpis.concluidos_mes_atual} chamados`,
        descricao: kpis.variacao_concluidos_vs_mes_anterior > 0 
          ? `Crescimento de +${kpis.variacao_concluidos_vs_mes_anterior}% vs. mês anterior`
          : "Ritmo de atendimento mantido dentro da meta",
      });
    } else {
      alertas.push({
        tipo: "warn",
        titulo: `${kpis.perc_dentro_do_prazo}% de resoluções dentro do prazo`,
        descricao: `Ciclo médio atual de ${kpis.tempo_medio_resolucao_dias} dias`,
      });
    }

    return {
      kpis,
      sparklines,
      evolucaoMensal,
      distribuicaoModulos,
      tarefas,
      topLojas,
      chamadosCriticos,
      alertas,
      filtrosAtivos: {
        modulo,
        periodo,
      },
      atualizadoEm: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };
  });
