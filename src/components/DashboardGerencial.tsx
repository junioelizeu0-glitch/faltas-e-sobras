import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { RefreshCcw, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  fetchDashboardGerencialData,
  type DashboardGerencialPayload,
  type ModuloFiltro,
  type PeriodoFiltro,
} from "@/lib/dashboard-gerencial.functions";
import { parseDataBR } from "@/lib/data-processing";

const fmtBR = (v: any) => {
  if (!v) return "—";
  const s = String(v);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = parseDataBR(s);
  if (!d) return s;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const brl = (n: number) => {
  return "R$ " + (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// =========================================================================
// COMPONENTES GRÁFICOS SVG NATIVOS (PROTÓTIPO V2)
// =========================================================================

// 1. Sparkline (Curva suave fluida sem cortes de borda)
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (!values || values.length === 0) return null;
  const w = 260;
  const h = 56;
  const mx = Math.max(...values);
  const mn = Math.min(...values);
  let range = mx - mn;
  const step = w / Math.max(1, values.length - 1);

  // Margens de segurança para garantir que o traço fique 100% dentro do card sem cortes
  const topPad = 14;
  const botPad = 10;
  const usableHeight = h - topPad - botPad;

  // Se os valores forem todos iguais ou quase iguais, criar uma oscilação orgânica suave de 5% para nunca ficar uma linha morta/reta
  const hasVariation = range > 0.05 * (mx || 1);
  const effectiveRange = hasVariation ? range : Math.max(1, (mx || 10) * 0.15);

  const points: [number, number][] = values.map((v, i) => {
    let norm: number;
    if (hasVariation) {
      norm = (v - mn) / effectiveRange;
    } else {
      // Oscilação suave senoidal sutil caso todos os números sejam exatamente idênticos
      norm = 0.5 + 0.18 * Math.sin((i / (values.length - 1)) * Math.PI * 2);
    }
    const clampedNorm = Math.max(0, Math.min(1, norm));
    const y = h - botPad - clampedNorm * usableHeight;
    const x = i * step;
    return [x, y];
  });

  // Interpolação suave cúbica com amortecimento de curvatura para manter linhas fluidas e naturais
  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 2] || points[i - 1];
    const p1 = points[i - 1];
    const p2 = points[i];
    const p3 = points[i + 1] || p2;

    const cp1x = p1[0] + (p2[0] - p0[0]) * 0.22;
    const cp1y = p1[1] + (p2[1] - p0[1]) * 0.22;
    const cp2x = p2[0] - (p3[0] - p1[0]) * 0.22;
    const cp2y = p2[1] - (p3[1] - p1[1]) * 0.22;

    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  const id = `spark-${Math.random().toString(36).substring(2, 9)}`;

  return (
    <svg
      className="w-[calc(100%+2rem)] h-14 -mx-4 mb-0 mt-1.5 block pointer-events-none"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// 2. Medidor Semicircular de SLA (Gauge)
function Gauge({ ate30, de31a60, acima60 }: { ate30: number; de31a60: number; acima60: number }) {
  const tot = ate30 + de31a60 + acima60 || 1;
  const percNoPrazo = (((ate30 + de31a60) / tot) * 100).toFixed(1).replace(".", ",");
  const seg = [ate30, de31a60, acima60];
  const cols = ["#0b6b4b", "#e8a317", "#d64545"];

  const pt = (ang: number, r: number) => [
    100 + r * Math.cos((ang * Math.PI) / 180),
    100 + r * Math.sin((ang * Math.PI) / 180),
  ];

  let a = 182;
  const paths: React.ReactNode[] = [];
  seg.forEach((s, i) => {
    if (s <= 0) return;
    const e = a + (s / tot) * 176;
    const [x0, y0] = pt(a, 80);
    const [x1, y1] = pt(e - 2, 80);
    paths.push(
      <path
        key={i}
        d={`M${x0},${y0} A80,80 0 0 1 ${x1},${y1}`}
        fill="none"
        stroke={cols[i]}
        strokeWidth="20"
      />
    );
    a = e + 2;
  });

  return (
    <div className="flex flex-col items-center my-1">
      <svg viewBox="0 0 200 118" className="w-full max-w-[260px] block my-2 mx-auto" role="img" aria-label="Medidor de SLA">
        {paths.length > 0 ? (
          paths
        ) : (
          <path d="M20,100 A80,80 0 0 1 180,100" fill="none" stroke="#e6ebe7" strokeWidth="20" />
        )}
        <text x="100" y="86" textAnchor="middle" fontSize="26" fontWeight="800" fill="#16241e">
          {percNoPrazo}%
        </text>
        <text x="100" y="104" textAnchor="middle" fontSize="10" fill="#7a8a82">
          no prazo (SLA)
        </text>
      </svg>
    </div>
  );
}

// 3. Gráfico de Barras Duplo de Evolução Mensal
function EvoMensal({
  data,
}: {
  data: { mes_label: string; abertos: number; concluidos: number }[];
}) {
  if (!data || data.length === 0) {
    return <div className="h-44 flex items-center justify-center text-xs text-[#7a8a82]">Sem dados no período</div>;
  }

  const maxVal = Math.max(...data.map((d) => Math.max(d.abertos, d.concluidos)), 10);
  const ceilStep = Math.ceil(maxVal / 4 / 10) * 10 || 25;
  const yTicks = [0, ceilStep, ceilStep * 2, ceilStep * 3, ceilStep * 4];
  const maxY = ceilStep * 4;
  const svgWidth = 420;
  const svgHeight = 200;
  const chartBottom = 170;
  const barScale = 140 / (maxY || 1);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full min-w-[320px] block my-1" role="img" aria-label="Evolução mensal">
        {yTicks.map((v) => {
          const y = chartBottom - v * barScale;
          return (
            <g key={v}>
              <line x1="28" x2="415" y1={y} y2={y} stroke="#e6ebe7" strokeDasharray="3 4" />
              <text x="22" y={y + 3} textAnchor="end" fontSize="9" fill="#7a8a82">
                {v}
              </text>
            </g>
          );
        })}

        {data.map((m, i) => {
          const colWidth = (svgWidth - 60) / data.length;
          const x = 38 + i * colWidth;
          const hAb = Math.max(2, m.abertos * barScale);
          const hCo = Math.max(2, m.concluidos * barScale);
          const wBar = Math.min(18, colWidth / 2.6);

          return (
            <g key={i}>
              {/* Barra Abertos */}
              <rect
                x={x}
                y={chartBottom - hAb}
                width={wBar}
                height={hAb}
                rx="3"
                fill="#0b6b4b"
              >
                <title>{`${m.mes_label} - Abertos: ${m.abertos}`}</title>
              </rect>
              {/* Barra Concluídos */}
              <rect
                x={x + wBar + 3}
                y={chartBottom - hCo}
                width={wBar}
                height={hCo}
                rx="3"
                fill="#9fd356"
              >
                <title>{`${m.mes_label} - Concluídos: ${m.concluidos}`}</title>
              </rect>
              {/* Rótulo do Mês */}
              <text x={x + wBar + 1.5} y="188" textAnchor="middle" fontSize="10" fill="#7a8a82">
                {m.mes_label.split("/")[0]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// 4. Gráfico Donut de Módulos (Recall x Faltas e Sobras)
function Donut({ recall, faltas }: { recall: number; faltas: number }) {
  const tot = recall + faltas || 1;
  const percRecall = Math.round((recall / tot) * 100);
  const circ = 2 * Math.PI * 44; // ~276.46
  const recallDash = (percRecall / 100) * circ;

  return (
    <div className="flex justify-center my-3">
      <svg viewBox="0 0 120 120" className="w-[150px] h-[150px] block" role="img">
        <circle cx="60" cy="60" r="44" fill="none" stroke="#bfe3d2" strokeWidth="15" />
        <circle
          cx="60"
          cy="60"
          r="44"
          fill="none"
          stroke="#0b6b4b"
          strokeWidth="15"
          strokeLinecap="round"
          strokeDasharray={`${recallDash} ${circ}`}
          transform="rotate(-90 60 60)"
        />
        <text x="60" y="58" textAnchor="middle" fontSize="22" fontWeight="800" fill="#16241e">
          {tot}
        </text>
        <text x="60" y="73" textAnchor="middle" fontSize="9" fill="#7a8a82">
          em aberto
        </text>
      </svg>
    </div>
  );
}

// =========================================================================
// COMPONENTE PRINCIPAL: DASHBOARD GERENCIAL V2
// =========================================================================

export default function DashboardGerencial() {
  const getDataFn = useServerFn(fetchDashboardGerencialData);

  const [modulo, setModulo] = useState<ModuloFiltro>("todos");
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("6m");
  const [data, setData] = useState<DashboardGerencialPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregarDados = async (m: ModuloFiltro = modulo, p: PeriodoFiltro = periodo, isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await getDataFn({ data: { modulo: m, periodo: p } });
      setData(res);
    } catch (err: any) {
      console.error("Erro ao carregar Dashboard Gerencial:", err);
      setError(err?.message || "Não foi possível carregar os dados do dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    carregarDados(modulo, periodo);
  }, [modulo, periodo]);

  const kpis = data?.kpis;
  const sparks = data?.sparklines;

  // Cálculos para proporção de módulos
  const modRecall = data?.distribuicaoModulos.find((d) => d.modulo === "recall");
  const modFaltas = data?.distribuicaoModulos.find((d) => d.modulo === "faltas");
  const recallAbertos = modRecall?.abertos || 0;
  const faltasAbertos = modFaltas?.abertos || 0;
  const totMod = recallAbertos + faltasAbertos || 1;
  const percRec = Math.round((recallAbertos / totMod) * 100);
  const percFal = 100 - percRec;

  return (
    <div className="min-h-screen bg-[#f1f4f1] text-[#16241e] font-sans antialiased text-[13px] [font-variant-numeric:tabular-nums]">
      
      {/* ========================================================================= */}
      {/* 1. BARRA SUPERIOR (BREADCRUMB + STATUS DO USUÁRIO LEITOR)                 */}
      {/* ========================================================================= */}
      <div className="flex justify-between items-center gap-3 px-6 py-3.5 bg-white border-b border-[#e6ebe7] flex-wrap">
        <div className="text-[#7a8a82] text-[13px]">
          Operação › <b className="text-[#16241e]">Dashboard</b>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[#7a8a82] text-xs flex items-center gap-1.5">
            <i className="inline-block w-[7px] h-[7px] rounded-full bg-[#58c27d] animate-pulse"></i>
            Dados atualizados às {data?.atualizadoEm || "..."}
          </span>
          <button
            type="button"
            onClick={() => carregarDados(modulo, periodo, true)}
            disabled={loading || refreshing}
            className="p-1 text-[#7a8a82] hover:text-[#0b6b4b] transition-colors disabled:opacity-50 cursor-pointer"
            title="Atualizar dados agora"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <div className="w-[34px] h-[34px] rounded-full bg-[#0b6b4b] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
            GR
          </div>
          <div>
            <b className="block text-[12.5px] leading-tight text-[#16241e]">Gerente</b>
            <span className="text-[11px] text-[#7a8a82]">Somente leitura</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CONTEÚDO PRINCIPAL (PAGE WRAPPER)                                      */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 space-y-4">
        
        {/* Cabeçalho da Página + Filtros Segmentados */}
        <div className="flex justify-between items-end flex-wrap gap-3">
          <h1 className="text-[21px] font-bold text-[#16241e] tracking-tight m-0">
            Visão geral da operação
          </h1>
          <div className="flex gap-2.5 flex-wrap">
            {/* Segmento Módulo */}
            <div className="inline-flex bg-white border border-[#e6ebe7] rounded-[10px] p-[3px] gap-[2px]">
              <button
                type="button"
                onClick={() => setModulo("todos")}
                className={`border-0 py-[7px] px-[13px] rounded-[8px] font-semibold text-[13px] cursor-pointer transition-colors ${
                  modulo === "todos" ? "bg-[#0b6b4b] text-white" : "text-[#7a8a82] hover:text-[#16241e]"
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setModulo("recall")}
                className={`border-0 py-[7px] px-[13px] rounded-[8px] font-semibold text-[13px] cursor-pointer transition-colors ${
                  modulo === "recall" ? "bg-[#0b6b4b] text-white" : "text-[#7a8a82] hover:text-[#16241e]"
                }`}
              >
                Recall
              </button>
              <button
                type="button"
                onClick={() => setModulo("faltas")}
                className={`border-0 py-[7px] px-[13px] rounded-[8px] font-semibold text-[13px] cursor-pointer transition-colors ${
                  modulo === "faltas" ? "bg-[#0b6b4b] text-white" : "text-[#7a8a82] hover:text-[#16241e]"
                }`}
              >
                Faltas e Sobras
              </button>
            </div>

            {/* Segmento Período */}
            <div className="inline-flex bg-white border border-[#e6ebe7] rounded-[10px] p-[3px] gap-[2px]">
              <button
                type="button"
                onClick={() => setPeriodo("30d")}
                className={`border-0 py-[7px] px-[13px] rounded-[8px] font-semibold text-[13px] cursor-pointer transition-colors ${
                  periodo === "30d" ? "bg-[#0b6b4b] text-white" : "text-[#7a8a82] hover:text-[#16241e]"
                }`}
              >
                30 dias
              </button>
              <button
                type="button"
                onClick={() => setPeriodo("6m")}
                className={`border-0 py-[7px] px-[13px] rounded-[8px] font-semibold text-[13px] cursor-pointer transition-colors ${
                  periodo === "6m" ? "bg-[#0b6b4b] text-white" : "text-[#7a8a82] hover:text-[#16241e]"
                }`}
              >
                6 meses
              </button>
              <button
                type="button"
                onClick={() => setPeriodo("ano")}
                className={`border-0 py-[7px] px-[13px] rounded-[8px] font-semibold text-[13px] cursor-pointer transition-colors ${
                  periodo === "ano" ? "bg-[#0b6b4b] text-white" : "text-[#7a8a82] hover:text-[#16241e]"
                }`}
              >
                Este ano
              </button>
            </div>
          </div>
        </div>

        {/* Loading ou Erro */}
        {loading && !data && (
          <div className="h-64 flex flex-col items-center justify-center gap-3 bg-white border border-[#e6ebe7] rounded-[14px]">
            <Loader2 className="w-8 h-8 text-[#0b6b4b] animate-spin" />
            <p className="text-xs font-semibold text-[#7a8a82]">Consolidando métricas e indicadores do Supabase...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-[14px] text-rose-700 text-xs">
            <strong>Erro:</strong> {error}
          </div>
        )}

        {/* Layout Grid Principal: Coluna Principal + Coluna Direita (300px) */}
        {data && (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start">
            
            {/* ========================================================================= */}
            {/* COLUNA ESQUERDA (PRINCIPAL)                                               */}
            {/* ========================================================================= */}
            <div className="flex flex-col gap-4 min-w-0">
              
              {/* 1. Três cartões de indicador (k3) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* KPI 1: Chamados em aberto */}
                <div className="bg-white border border-[#e6ebe7] rounded-[14px] p-4 pb-0 relative overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="m-0 text-[13.5px] font-bold text-[#16241e]">Chamados em aberto</h3>
                      <div className="text-[#7a8a82] text-[11.5px] mt-0.5">Total ainda sem encerramento</div>
                    </div>
                    <span
                      className={`text-[11px] font-bold py-[3px] px-2 rounded-[6px] whitespace-nowrap ${
                        (kpis?.variacao_vs_mes_anterior || 0) <= 0
                          ? "bg-[#e8f4ee] text-[#0b6b4b]"
                          : "bg-[#fbe6e6] text-[#d64545]"
                      }`}
                    >
                      {(kpis?.variacao_vs_mes_anterior || 0) <= 0 ? "▼" : "▲"}{" "}
                      {Math.abs(kpis?.variacao_vs_mes_anterior || 0).toFixed(1).replace(".", ",")}%
                    </span>
                  </div>
                  <div className="text-[26px] font-extrabold text-[#16241e] mt-3 tracking-tight">
                    {kpis?.total_abertos || 0}{" "}
                    <small className="text-[13px] font-semibold text-[#7a8a82]">chamados</small>
                  </div>
                  <Sparkline values={sparks?.abertos || []} color="#0b6b4b" />
                </div>

                {/* KPI 2: Valor em aberto */}
                <div className="bg-white border border-[#e6ebe7] rounded-[14px] p-4 pb-0 relative overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="m-0 text-[13.5px] font-bold text-[#16241e]">Valor em aberto</h3>
                      <div className="text-[#7a8a82] text-[11.5px] mt-0.5">Montante financeiro pendente</div>
                    </div>
                    <span
                      className={`text-[11px] font-bold py-[3px] px-2 rounded-[6px] whitespace-nowrap ${
                        (kpis?.variacao_valor_vs_mes_anterior || 0) <= 0
                          ? "bg-[#e8f4ee] text-[#0b6b4b]"
                          : "bg-[#fbe6e6] text-[#d64545]"
                      }`}
                    >
                      {(kpis?.variacao_valor_vs_mes_anterior || 0) <= 0 ? "▼" : "▲"}{" "}
                      {Math.abs(kpis?.variacao_valor_vs_mes_anterior || 0).toFixed(1).replace(".", ",")}%
                    </span>
                  </div>
                  <div className="text-[26px] font-extrabold text-[#16241e] mt-3 tracking-tight">
                    {brl(kpis?.valor_total_aberto || 0)}
                  </div>
                  <Sparkline values={sparks?.valor || []} color="#2f9a74" />
                </div>

                {/* KPI 3: SLA estourado */}
                <div className="bg-white border border-[#e6ebe7] rounded-[14px] p-4 pb-0 relative overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="m-0 text-[13.5px] font-bold text-[#16241e]">SLA estourado</h3>
                      <div className="text-[#7a8a82] text-[11.5px] mt-0.5">Acima de 60 dias</div>
                    </div>
                    <span className="text-[11px] font-bold py-[3px] px-2 rounded-[6px] whitespace-nowrap bg-[#fbe6e6] text-[#d64545]">
                      {kpis?.perc_sla_estourado || 0}%
                    </span>
                  </div>
                  <div className="text-[26px] font-extrabold text-[#16241e] mt-3 tracking-tight">
                    {kpis?.total_sla_estourado || 0}{" "}
                    <small className="text-[13px] font-semibold text-[#7a8a82]">chamados</small>
                  </div>
                  <Sparkline values={sparks?.sla || []} color="#d64545" />
                </div>

              </div>

              {/* 2. Dois cards: Prazo (Gauge) x Evolução Mensal */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.25fr] gap-4">
                
                {/* Chamados dentro do prazo */}
                <div className="bg-white border border-[#e6ebe7] rounded-[14px] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="m-0 text-[13.5px] font-bold text-[#16241e]">Chamados dentro do prazo</h3>
                      <div className="text-[#7a8a82] text-[11.5px] mt-0.5">Meta: 85% resolvidos em até 60 dias</div>
                    </div>
                  </div>

                  <Gauge
                    ate30={kpis?.sla_ate_30d || 0}
                    de31a60={kpis?.sla_31_a_60d || 0}
                    acima60={kpis?.sla_acima_60d || 0}
                  />

                  <div className="flex justify-between items-center gap-2 py-2 border-t border-[#e6ebe7] text-[12.5px]">
                    <span className="text-[#16241e]">Dentro do prazo (até 30d)</span>
                    <b className="font-bold text-[#16241e]">{kpis?.sla_ate_30d || 0}</b>
                  </div>
                  <div className="flex justify-between items-center gap-2 py-2 border-t border-[#e6ebe7] text-[12.5px]">
                    <span className="text-[#16241e]">Atenção (31 a 60d)</span>
                    <b className="font-bold text-[#16241e]">{kpis?.sla_31_a_60d || 0}</b>
                  </div>
                  <div className="flex justify-between items-center gap-2 py-2 border-t border-[#e6ebe7] text-[12.5px]">
                    <span className="text-[#16241e]">Estourado (+60d)</span>
                    <b className="font-bold text-[#d64545]">{kpis?.sla_acima_60d || 0}</b>
                  </div>
                </div>

                {/* Evolução mensal */}
                <div className="bg-white border border-[#e6ebe7] rounded-[14px] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2 flex-wrap mb-2">
                      <div>
                        <h3 className="m-0 text-[13.5px] font-bold text-[#16241e]">Evolução mensal</h3>
                        <div className="text-[#7a8a82] text-[11.5px] mt-0.5">Chamados abertos x concluídos</div>
                      </div>
                      <div className="flex gap-3 text-[11.5px] text-[#7a8a82]">
                        <span className="flex items-center gap-1.5">
                          <i className="inline-block w-[9px] h-[9px] rounded-[3px] bg-[#0b6b4b]"></i>
                          Abertos
                        </span>
                        <span className="flex items-center gap-1.5">
                          <i className="inline-block w-[9px] h-[9px] rounded-[3px] bg-[#9fd356]"></i>
                          Concluídos
                        </span>
                      </div>
                    </div>

                    <EvoMensal data={data.evolucaoMensal} />
                  </div>
                </div>

              </div>

              {/* 3. Tabela: Chamados Críticos */}
              <div className="bg-white border border-[#e6ebe7] rounded-[14px] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div>
                    <h3 className="m-0 text-[13.5px] font-bold text-[#16241e]">Chamados críticos</h3>
                    <div className="text-[#7a8a82] text-[11.5px] mt-0.5">Em aberto há mais tempo, ordenados por SLA</div>
                  </div>
                  <span className="text-[11px] font-bold py-[3px] px-2 rounded-[6px] whitespace-nowrap bg-[#fbe6e6] text-[#d64545]">
                    {kpis?.total_acima_45d || 0} acima de 45 dias
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[640px] text-left">
                    <thead>
                      <tr>
                        <th className="text-[11px] text-[#7a8a82] font-semibold p-2.5 bg-[#f6f9f7] border-b border-[#e6ebe7]">Chamado</th>
                        <th className="text-[11px] text-[#7a8a82] font-semibold p-2.5 bg-[#f6f9f7] border-b border-[#e6ebe7]">Loja</th>
                        <th className="text-[11px] text-[#7a8a82] font-semibold p-2.5 bg-[#f6f9f7] border-b border-[#e6ebe7]">Tarefa atual</th>
                        <th className="text-[11px] text-[#7a8a82] font-semibold p-2.5 bg-[#f6f9f7] border-b border-[#e6ebe7]">Status</th>
                        <th className="text-[11px] text-[#7a8a82] font-semibold p-2.5 bg-[#f6f9f7] border-b border-[#e6ebe7]">Abertura</th>
                        <th className="text-[11px] text-[#7a8a82] font-semibold p-2.5 bg-[#f6f9f7] border-b border-[#e6ebe7] w-[170px]">SLA (limite 60d)</th>
                        <th className="text-[11px] text-[#7a8a82] font-semibold p-2.5 bg-[#f6f9f7] border-b border-[#e6ebe7] text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.chamadosCriticos.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-6 text-xs text-[#7a8a82]">
                            Nenhum chamado crítico em aberto neste módulo
                          </td>
                        </tr>
                      ) : (
                        data.chamadosCriticos.map((c) => {
                          const percSla = Math.min(100, Math.round((c.dias_aberto / 60) * 100));
                          const barColor =
                            c.dias_aberto > 60
                              ? "#d64545"
                              : c.dias_aberto > 45
                              ? "#e0762f"
                              : c.dias_aberto > 30
                              ? "#e8a317"
                              : "#0b6b4b";

                          return (
                            <tr key={c.id} className="border-b border-[#e6ebe7] last:border-b-0 hover:bg-[#f6f9f7]/50 transition-colors">
                              <td className="p-2.5 text-[12.5px]">
                                <Link
                                  to="/consulta"
                                  search={{ chamado: c.chamado }}
                                  className="font-bold text-[#0b6b4b] hover:underline"
                                  title="Abrir chamado na Consulta"
                                >
                                  {c.chamado}
                                </Link>
                              </td>
                              <td className="p-2.5 text-[12.5px] text-[#16241e]">{c.loja}</td>
                              <td className="p-2.5 text-[12.5px] text-[#16241e] max-w-[200px] truncate" title={c.tarefa_atual}>
                                {c.tarefa_atual}
                              </td>
                              <td className="p-2.5 text-[12.5px]">
                                <span
                                  className={`py-[3px] px-2 rounded-[6px] text-[11px] font-semibold ${
                                    c.status_chamado.toLowerCase().includes("aprov") ||
                                    c.status_chamado.toLowerCase().includes("concl")
                                      ? "bg-[#e8f4ee] text-[#0b6b4b]"
                                      : "bg-[#fdf1d3] text-[#9a6a00]"
                                  }`}
                                >
                                  {c.status_chamado}
                                </span>
                              </td>
                              <td className="p-2.5 text-[12.5px] text-[#16241e]">{fmtBR(c.dt_abertura)}</td>
                              <td className="p-2.5 text-[12.5px]">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-[6px] bg-[#f6f9f7] rounded-[4px] overflow-hidden min-w-[70px]">
                                    <div
                                      className="h-full rounded-[4px]"
                                      style={{ width: `${percSla}%`, backgroundColor: barColor }}
                                    ></div>
                                  </div>
                                  <span className="text-[11px] text-[#7a8a82] w-[30px] text-right">
                                    {c.dias_aberto}d
                                  </span>
                                </div>
                              </td>
                              <td className="p-2.5 text-[12.5px] text-right font-bold text-[#16241e]">
                                {brl(c.valor)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. Dois cards: Tarefas (Onde estão parados) x Lojas (Valor em aberto) */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.25fr] gap-4">
                
                {/* Onde os chamados estão parados */}
                <div className="bg-white border border-[#e6ebe7] rounded-[14px] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <h3 className="m-0 text-[13.5px] font-bold text-[#16241e]">Onde os chamados estão parados</h3>
                  <div className="text-[#7a8a82] text-[11.5px] mt-0.5 mb-3">Quantidade por tarefa atual e idade média</div>

                  <div className="space-y-3">
                    {data.tarefas.map((t, idx) => {
                      const maxT = data.tarefas[0]?.total || 1;
                      const percW = Math.round((t.total / maxT) * 100);
                      const badgeCls =
                        t.idade_media_dias > 45
                          ? "bg-[#fbe6e6] text-[#d64545]"
                          : t.idade_media_dias > 30
                          ? "bg-[#fdf1d3] text-[#9a6a00]"
                          : "bg-[#e8f4ee] text-[#0b6b4b]";

                      return (
                        <div key={idx} className="grid grid-cols-[130px_1fr_26px_52px] gap-2.5 items-center text-[12px]">
                          <span className="truncate text-[#16241e]" title={t.tarefa}>
                            {t.tarefa}
                          </span>
                          <div className="block">
                            <div className="h-[9px] bg-[#f6f9f7] rounded-[4px] overflow-hidden">
                              <div
                                className="h-full bg-[#0b6b4b] rounded-[4px]"
                                style={{ width: `${percW}%` }}
                              ></div>
                            </div>
                          </div>
                          <b className="text-right text-[#16241e]">{t.total}</b>
                          <span className={`text-[11px] font-bold py-[2px] px-1.5 rounded-[5px] text-center ${badgeCls}`}>
                            {t.idade_media_dias}d
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Valor em aberto por loja */}
                <div className="bg-white border border-[#e6ebe7] rounded-[14px] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <h3 className="m-0 text-[13.5px] font-bold text-[#16241e]">Valor em aberto por loja</h3>
                  <div className="text-[#7a8a82] text-[11.5px] mt-0.5 mb-3">Top 6 lojas, em R$ mil</div>

                  <div className="space-y-3">
                    {data.topLojas.map((l, idx) => {
                      const maxV = data.topLojas[0]?.valor_total || 1;
                      const percW = Math.round((l.valor_total / maxV) * 100);
                      const barCol = idx === 0 ? "#0b6b4b" : "#2f9a74";
                      const valMil = (l.valor_total / 1000).toFixed(1).replace(".", ",");

                      return (
                        <div key={idx} className="grid grid-cols-[70px_1fr_50px] gap-2.5 items-center text-[12px]">
                          <span className="text-[#16241e] font-medium truncate">{l.loja}</span>
                          <div className="block">
                            <div className="h-[9px] bg-[#f6f9f7] rounded-[4px] overflow-hidden">
                              <div
                                className="h-full rounded-[4px]"
                                style={{ width: `${percW}%`, backgroundColor: barCol }}
                              ></div>
                            </div>
                          </div>
                          <b className="text-right text-[#16241e] whitespace-nowrap">{valMil}</b>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>

            {/* ========================================================================= */}
            {/* COLUNA DIREITA (300px)                                                    */}
            {/* ========================================================================= */}
            <div className="flex flex-col gap-4">
              
              {/* Card 1: Donut Recall x Faltas */}
              <div className="bg-white border border-[#e6ebe7] rounded-[14px] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                <h3 className="m-0 text-[13.5px] font-bold text-[#16241e]">Recall x Faltas e Sobras</h3>
                <div className="text-[#7a8a82] text-[11.5px] mt-0.5">Proporção de chamados em aberto</div>

                <Donut recall={recallAbertos} faltas={faltasAbertos} />

                <div className="flex justify-center gap-3 text-[11.5px] text-[#7a8a82] mt-1">
                  <span className="flex items-center gap-1.5">
                    <i className="inline-block w-[9px] h-[9px] rounded-[3px] bg-[#0b6b4b]"></i>
                    Recall {percRec}%
                  </span>
                  <span className="flex items-center gap-1.5">
                    <i className="inline-block w-[9px] h-[9px] rounded-[3px] bg-[#bfe3d2]"></i>
                    Faltas e Sobras {percFal}%
                  </span>
                </div>
              </div>

              {/* Card 2: Mini KPI - Tempo de resolução */}
              <div className="bg-white border border-[#e6ebe7] rounded-[14px] p-4 pb-0 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="m-0 text-[13.5px] font-bold text-[#16241e]">Tempo de resolução</h3>
                    <div className="text-[#7a8a82] text-[11.5px] mt-0.5">Ciclo médio de atendimento</div>
                  </div>
                  <span className="text-[11px] font-bold py-[3px] px-2 rounded-[6px] whitespace-nowrap bg-[#fdf1d3] text-[#9a6a00]">
                    ▲ {kpis?.tempo_medio_resolucao_dias || 0}d
                  </span>
                </div>
                <div className="text-[22px] font-extrabold text-[#16241e] mt-2 tracking-tight">
                  {(kpis?.tempo_medio_resolucao_dias || 0).toFixed(1).replace(".", ",")}{" "}
                  <small className="text-[13px] font-semibold text-[#7a8a82]">dias</small>
                </div>
                <Sparkline values={sparks?.tempo || []} color="#e8a317" />
              </div>

              {/* Card 3: Mini KPI - Concluídos no mês */}
              <div className="bg-white border border-[#e6ebe7] rounded-[14px] p-4 pb-0 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="m-0 text-[13.5px] font-bold text-[#16241e]">Concluídos no mês</h3>
                    <div className="text-[#7a8a82] text-[11.5px] mt-0.5">Finalizados no mês corrente</div>
                  </div>
                  <span
                    className={`text-[11px] font-bold py-[3px] px-2 rounded-[6px] whitespace-nowrap ${
                      (kpis?.variacao_concluidos_vs_mes_anterior || 0) >= 0
                        ? "bg-[#e8f4ee] text-[#0b6b4b]"
                        : "bg-[#fdf1d3] text-[#9a6a00]"
                    }`}
                  >
                    {(kpis?.variacao_concluidos_vs_mes_anterior || 0) >= 0 ? "▲" : "▼"}{" "}
                    {Math.abs(kpis?.variacao_concluidos_vs_mes_anterior || 0).toFixed(0)}%
                  </span>
                </div>
                <div className="text-[22px] font-extrabold text-[#16241e] mt-2 tracking-tight">
                  {kpis?.concluidos_mes_atual || 0}{" "}
                  <small className="text-[13px] font-semibold text-[#7a8a82]">chamados</small>
                </div>
                <Sparkline values={sparks?.concluidos || []} color="#2f9a74" />
              </div>

              {/* Card 4: Mini KPI - Ticket médio */}
              <div className="bg-white border border-[#e6ebe7] rounded-[14px] p-4 pb-0 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="m-0 text-[13.5px] font-bold text-[#16241e]">Ticket médio</h3>
                    <div className="text-[#7a8a82] text-[11.5px] mt-0.5">Valor médio por chamado</div>
                  </div>
                  <span className="text-[11px] font-bold py-[3px] px-2 rounded-[6px] whitespace-nowrap bg-[#e8f4ee] text-[#0b6b4b]">
                    Média
                  </span>
                </div>
                <div className="text-[22px] font-extrabold text-[#16241e] mt-2 tracking-tight">
                  {brl(kpis?.ticket_medio || 0)}
                </div>
                <Sparkline values={sparks?.ticket || []} color="#0b6b4b" />
              </div>

              {/* Card 5: Alertas */}
              <div className="bg-white border border-[#e6ebe7] rounded-[14px] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                <h3 className="m-0 text-[13.5px] font-bold text-[#16241e]">Alertas</h3>
                <div className="text-[#7a8a82] text-[11.5px] mt-0.5 mb-2">O que precisa de atenção hoje</div>

                <div className="divide-y divide-[#e6ebe7]">
                  {data.alertas.map((al, idx) => {
                    const dotColor =
                      al.tipo === "bad"
                        ? "bg-[#d64545]"
                        : al.tipo === "warn"
                        ? "bg-[#e8a317]"
                        : "bg-[#2f9a74]";

                    return (
                      <div key={idx} className="py-2.5 first:pt-1 last:pb-1 flex gap-2.5 items-start">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColor}`}></div>
                        <div>
                          <b className="block text-[12.5px] text-[#16241e] leading-snug">{al.titulo}</b>
                          <span className="text-[11.5px] text-[#7a8a82] leading-tight">{al.descricao}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3.5 bg-[#f6f9f7] rounded-[8px] p-2.5 text-[11.5px] text-[#7a8a82]">
                  Dados consolidados em tempo real do banco Supabase. Tela somente leitura.
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
