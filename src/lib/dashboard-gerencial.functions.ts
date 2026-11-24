import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ModuloFiltro = "todos" | "faltas" | "recall";
export type PeriodoFiltro = "30d" | "6m" | "ano" | "todos";

export type DashboardGerencialKPIs = {
  total_chamados_periodo: number;
  total_abertos: number;
  valor_total_aberto: number;
  total_sla_estourado: number;
  perc_sla_estourado: number;
  concluidos_mes_atual: number;
  tempo_medio_resolucao_dias: number;
  perc_dentro_do_prazo: number;
  novos_mes_atual: number;
  novos_mes_anterior: number;
  variacao_vs_mes_anterior: number;
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
};

export type FaixaIdadeItem = {
  faixa: string;
  label: string;
  dias_label: string;
  quantidade: number;
  percentual: number;
  color: string;
};

export type TopLojaItem = {
  loja: string;
  tipo: string;
  total_chamados: number;
  valor_total: number;
  percentual_do_max: number;
};

export type CDItem = {
  cd: string;
  total_chamados: number;
  total_abertos: number;
  valor_aberto: number;
};

export type ChamadoAntigoItem = {
  id: string;
  modulo: "faltas" | "recall";
  modulo_label: string;
  chamado: string;
  loja: string;
  cd: string;
  tipo: string;
  tarefa_atual: string;
  dt_abertura: string;
  dias_aberto: number;
  valor: number;
};

export type DashboardGerencialPayload = {
  kpis: DashboardGerencialKPIs;
  evolucaoMensal: EvolucaoMensalItem[];
  distribuicaoModulos: DistribuicaoModuloItem[];
  tarefas: TarefaItem[];
  faixasIdade: FaixaIdadeItem[];
  topLojas: TopLojaItem[];
  cds: CDItem[];
  chamadosAntigos: ChamadoAntigoItem[];
  filtrosAtivos: {
    modulo: ModuloFiltro;
    periodo: PeriodoFiltro;
  };
  atualizadoEm: string;
};

const DashboardGerencialInput = z.object({
  modulo: z.enum(["todos", "faltas", "recall"]).default("todos"),
  periodo: z.enum(["30d", "6m", "ano", "todos"]).default("6m"),
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

    // SQL Principal Agregado
    const sql = `
    WITH base AS (
      SELECT 
        'faltas' AS modulo,
        'Faltas e Sobras' AS modulo_label,
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
        'recall' AS modulo,
        'Recall' AS modulo_label,
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
      SELECT * FROM base
      WHERE 1=1 ${moduloFilter} ${periodoFilter}
    ),
    abertos_atuais AS (
      SELECT * FROM base
      WHERE em_aberto ${moduloFilter}
    ),
    mes_stats AS (
      SELECT 
        COUNT(*) FILTER (WHERE dt_abertura >= DATE_TRUNC('month', CURRENT_DATE))::int AS abertos_mes_atual,
        COUNT(*) FILTER (
          WHERE dt_abertura >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') 
            AND dt_abertura < DATE_TRUNC('month', CURRENT_DATE)
        )::int AS abertos_mes_anterior
      FROM base
      WHERE 1=1 ${moduloFilter}
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
      COUNT(*) FILTER (
        WHERE NOT em_aberto 
          AND dt_finalizacao >= DATE_TRUNC('month', CURRENT_DATE)::date
      )::int AS concluidos_mes_atual,
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
      END AS variacao_vs_mes_anterior
    FROM filtrado;
    `.trim();

    // Query de Evolução Mensal (Últimos 6 a 12 meses dependendo do período)
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

    // Query de Distribuição por Módulo
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

    // Query de Tarefas em Aberto
    const sqlTarefas = `
    WITH base AS (
      SELECT 'faltas' AS modulo, situacao, valor, dt_finalizacao FROM chamados_faltas
      UNION ALL
      SELECT 'recall' AS modulo, situacao, valor, dt_finalizacao FROM chamados_recall
    )
    SELECT 
      COALESCE(NULLIF(TRIM(situacao), ''), 'Não informada') AS tarefa,
      COUNT(*)::int AS total,
      COALESCE(SUM(valor), 0)::numeric AS valor_total
    FROM base
    WHERE (dt_finalizacao IS NULL OR TRIM(dt_finalizacao::text) = '' OR TRIM(dt_finalizacao::text) = '-') ${moduloFilter}
    GROUP BY 1
    ORDER BY total DESC
    LIMIT 10;
    `.trim();

    // Query de Faixas de Idade dos Chamados em Aberto
    const sqlFaixas = `
    WITH base AS (
      SELECT 'faltas' AS modulo, (CURRENT_DATE - dt_abertura)::int AS dias, dt_finalizacao FROM chamados_faltas
      UNION ALL
      SELECT 'recall' AS modulo, (CURRENT_DATE - dt_abertura)::int AS dias, dt_finalizacao FROM chamados_recall
    )
    SELECT 
      COUNT(*) FILTER (WHERE dias BETWEEN 0 AND 15)::int AS faixa_0_15,
      COUNT(*) FILTER (WHERE dias BETWEEN 16 AND 30)::int AS faixa_16_30,
      COUNT(*) FILTER (WHERE dias BETWEEN 31 AND 60)::int AS faixa_31_60,
      COUNT(*) FILTER (WHERE dias > 60)::int AS faixa_60_plus
    FROM base
    WHERE (dt_finalizacao IS NULL OR TRIM(dt_finalizacao::text) = '' OR TRIM(dt_finalizacao::text) = '-') ${moduloFilter};
    `.trim();

    // Query Top 6 Lojas
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

    // Query Chamados por CD
    const sqlCD = `
    WITH base AS (
      SELECT 'faltas' AS modulo, cd, valor, dt_finalizacao FROM chamados_faltas
      UNION ALL
      SELECT 'recall' AS modulo, cd, valor, dt_finalizacao FROM chamados_recall
    )
    SELECT 
      COALESCE(NULLIF(TRIM(cd), ''), 'Geral') AS cd,
      COUNT(*)::int AS total_chamados,
      COUNT(*) FILTER (WHERE dt_finalizacao IS NULL OR TRIM(dt_finalizacao::text) = '' OR TRIM(dt_finalizacao::text) = '-')::int AS total_abertos,
      COALESCE(SUM(valor) FILTER (WHERE dt_finalizacao IS NULL OR TRIM(dt_finalizacao::text) = '' OR TRIM(dt_finalizacao::text) = '-'), 0)::numeric AS valor_aberto
    FROM base
    WHERE 1=1 ${moduloFilter}
    GROUP BY 1
    ORDER BY total_abertos DESC;
    `.trim();

    // Query Chamados Mais Antigos
    const sqlAntigos = `
    WITH base AS (
      SELECT 'faltas' AS modulo, 'Faltas e Sobras' AS modulo_label, id, chamado, loja, cd, tipo, situacao AS tarefa_atual, dt_abertura, dt_finalizacao, valor FROM chamados_faltas
      UNION ALL
      SELECT 'recall' AS modulo, 'Recall' AS modulo_label, id, chamado, loja, cd, tipo, situacao AS tarefa_atual, dt_abertura, dt_finalizacao, valor FROM chamados_recall
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
      { data: mensalData, error: mensalErr },
      { data: modulosData, error: modulosErr },
      { data: tarefasData, error: tarefasErr },
      { data: faixasData, error: faixasErr },
      { data: lojasData, error: lojasErr },
      { data: cdData, error: cdErr },
      { data: antigosData, error: antigosErr },
    ] = await Promise.all([
      supabase.rpc("aiiliana_run_sql", { sql }),
      supabase.rpc("aiiliana_run_sql", { sql: sqlMensal }),
      supabase.rpc("aiiliana_run_sql", { sql: sqlModulos }),
      supabase.rpc("aiiliana_run_sql", { sql: sqlTarefas }),
      supabase.rpc("aiiliana_run_sql", { sql: sqlFaixas }),
      supabase.rpc("aiiliana_run_sql", { sql: sqlLojas }),
      supabase.rpc("aiiliana_run_sql", { sql: sqlCD }),
      supabase.rpc("aiiliana_run_sql", { sql: sqlAntigos }),
    ]);

    if (kpiErr) console.warn("[DashboardGerencial] KPI error:", kpiErr);
    if (mensalErr) console.warn("[DashboardGerencial] Mensal error:", mensalErr);

    const rawKpi = (kpiData && kpiData[0]) || {};

    const kpis: DashboardGerencialKPIs = {
      total_chamados_periodo: Number(rawKpi.total_chamados_periodo || 0),
      total_abertos: Number(rawKpi.total_abertos || 0),
      valor_total_aberto: Number(rawKpi.valor_total_aberto || 0),
      total_sla_estourado: Number(rawKpi.total_sla_estourado || 0),
      perc_sla_estourado: Number(rawKpi.perc_sla_estourado || 0),
      concluidos_mes_atual: Number(rawKpi.concluidos_mes_atual || 0),
      tempo_medio_resolucao_dias: Number(rawKpi.tempo_medio_resolucao_dias || 0),
      perc_dentro_do_prazo: Number(rawKpi.perc_dentro_do_prazo || 0),
      novos_mes_atual: Number(rawKpi.novos_mes_atual || 0),
      novos_mes_anterior: Number(rawKpi.novos_mes_anterior || 0),
      variacao_vs_mes_anterior: Number(rawKpi.variacao_vs_mes_anterior || 0),
    };

    // Formatar meses
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
          fill: m.modulo === "recall" ? "#06b6d4" : "#047857",
        }))
      : [];

    // Formatar Tarefas
    const tarefas: TarefaItem[] = Array.isArray(tarefasData)
      ? tarefasData.map((t: any) => ({
          tarefa: String(t.tarefa),
          total: Number(t.total || 0),
          valor_total: Number(t.valor_total || 0),
        }))
      : [];

    // Formatar Faixas de Idade
    const rawF = (faixasData && faixasData[0]) || {};
    const totalFaixas = (Number(rawF.faixa_0_15 || 0) + Number(rawF.faixa_16_30 || 0) + Number(rawF.faixa_31_60 || 0) + Number(rawF.faixa_60_plus || 0)) || 1;
    const faixasIdade: FaixaIdadeItem[] = [
      {
        faixa: "0_15",
        label: "0 a 15 dias",
        dias_label: "Recém abertos",
        quantidade: Number(rawF.faixa_0_15 || 0),
        percentual: Math.round((Number(rawF.faixa_0_15 || 0) / totalFaixas) * 100),
        color: "#059669", // Verde esmeralda
      },
      {
        faixa: "16_30",
        label: "16 a 30 dias",
        dias_label: "Em andamento normal",
        quantidade: Number(rawF.faixa_16_30 || 0),
        percentual: Math.round((Number(rawF.faixa_16_30 || 0) / totalFaixas) * 100),
        color: "#0284c7", // Azul
      },
      {
        faixa: "31_60",
        label: "31 a 60 dias",
        dias_label: "Atenção (prazo crítico)",
        quantidade: Number(rawF.faixa_31_60 || 0),
        percentual: Math.round((Number(rawF.faixa_31_60 || 0) / totalFaixas) * 100),
        color: "#d97706", // Âmbar
      },
      {
        faixa: "60_plus",
        label: "60+ dias",
        dias_label: "SLA Estourado (Atraso)",
        quantidade: Number(rawF.faixa_60_plus || 0),
        percentual: Math.round((Number(rawF.faixa_60_plus || 0) / totalFaixas) * 100),
        color: "#e11d48", // Rosa/Vermelho
      },
    ];

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

    // Formatar CDs
    const cds: CDItem[] = Array.isArray(cdData)
      ? cdData.map((c: any) => ({
          cd: String(c.cd),
          total_chamados: Number(c.total_chamados || 0),
          total_abertos: Number(c.total_abertos || 0),
          valor_aberto: Number(c.valor_aberto || 0),
        }))
      : [];

    // Formatar Chamados Antigos
    const chamadosAntigos: ChamadoAntigoItem[] = Array.isArray(antigosData)
      ? antigosData.map((a: any) => ({
          id: String(a.id),
          modulo: a.modulo as "faltas" | "recall",
          modulo_label: String(a.modulo_label),
          chamado: String(a.chamado),
          loja: String(a.loja),
          cd: String(a.cd),
          tipo: String(a.tipo),
          tarefa_atual: String(a.tarefa_atual),
          dt_abertura: String(a.dt_abertura),
          dias_aberto: Number(a.dias_aberto || 0),
          valor: Number(a.valor || 0),
        }))
      : [];

    return {
      kpis,
      evolucaoMensal,
      distribuicaoModulos,
      tarefas,
      faixasIdade,
      topLojas,
      cds,
      chamadosAntigos,
      filtrosAtivos: {
        modulo,
        periodo,
      },
      atualizadoEm: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };
  });
