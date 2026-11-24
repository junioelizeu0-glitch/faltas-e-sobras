import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Banknote,
  Layers,
  RefreshCcw,
  ShieldCheck,
  Building2,
  Calendar,
  ExternalLink,
  Eye,
  Store,
  MapPin,
  Filter,
  Inbox,
  Package,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  fetchDashboardGerencialData,
  type DashboardGerencialPayload,
  type ModuloFiltro,
  type PeriodoFiltro,
} from "@/lib/dashboard-gerencial.functions";
import { formatarMoedaBR, parseDataBR } from "@/lib/data-processing";

const fmtBR = (v: any) => {
  if (!v) return "—";
  const s = String(v);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = parseDataBR(s);
  if (!d) return s;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

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

  return (
    <div className="min-h-screen bg-[#F4F6F5] text-slate-800 p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
      
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO EXECUTIVO E BARRA DE CONTROLES SOMENTE LEITURA               */}
      {/* ========================================================================= */}
      <header className="bg-white rounded-2xl border border-slate-200/70 p-5 sm:p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#20352d] text-white flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Dashboard Gerencial
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  <Eye className="w-3 h-3 text-slate-500" />
                  Somente Leitura
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Indicadores executivos consolidados, SLAs e conformidade operacional
              </p>
            </div>
          </div>
        </div>

        {/* Status de Atualização e Botão de Refresh */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          {data?.atualizadoEm && (
            <span className="text-xs text-slate-400 hidden sm:inline">
              Atualizado às <strong className="text-slate-600">{data.atualizadoEm}</strong>
            </span>
          )}
          <button
            type="button"
            onClick={() => carregarDados(modulo, periodo, true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-semibold text-xs border border-slate-200/80 transition-all cursor-pointer shadow-2xs disabled:opacity-60"
            title="Atualizar dados do banco"
          >
            <RefreshCcw className={`w-3.5 h-3.5 text-emerald-600 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Atualizando..." : "Atualizar"}</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. FILTROS NO TOPO (MÓDULO E PERÍODO)                                     */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-2xl border border-slate-200/70 p-4 sm:p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Filtro de Módulo (Segmented Control) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Módulo:
          </span>
          <div className="inline-flex p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 max-w-full overflow-x-auto gap-1">
            <button
              type="button"
              onClick={() => setModulo("todos")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                modulo === "todos"
                  ? "bg-[#20352d] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              Todos os Módulos
            </button>
            <button
              type="button"
              onClick={() => setModulo("recall")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                modulo === "recall"
                  ? "bg-[#20352d] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <RefreshCcw className="w-3 h-3 text-cyan-400" />
              <span>Recall</span>
            </button>
            <button
              type="button"
              onClick={() => setModulo("faltas")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                modulo === "faltas"
                  ? "bg-[#20352d] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Package className="w-3 h-3 text-emerald-400" />
              <span>Faltas e Sobras</span>
            </button>
          </div>
        </div>

        {/* Filtro de Período (Segmented Control) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Período:
          </span>
          <div className="inline-flex p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 max-w-full overflow-x-auto gap-1">
            <button
              type="button"
              onClick={() => setPeriodo("30d")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                periodo === "30d"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              Últimos 30 dias
            </button>
            <button
              type="button"
              onClick={() => setPeriodo("6m")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                periodo === "6m"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              6 meses
            </button>
            <button
              type="button"
              onClick={() => setPeriodo("ano")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                periodo === "ano"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              Este ano
            </button>
            <button
              type="button"
              onClick={() => setPeriodo("todos")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                periodo === "todos"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              Todos
            </button>
          </div>
        </div>

      </section>

      {/* ========================================================================= */}
      {/* ESTADO DE CARREGAMENTO / ERRO                                             */}
      {/* ========================================================================= */}
      {loading && !data && (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-16 text-center shadow-xs flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <h3 className="text-base font-bold text-slate-800">Carregando indicadores gerenciais...</h3>
          <p className="text-xs text-slate-500">Consultando views e agregações SQL no Supabase em tempo real.</p>
        </div>
      )}

      {error && !loading && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="text-base font-bold text-rose-800">Erro ao carregar dados</h3>
          <p className="text-xs text-rose-600">{error}</p>
          <button
            onClick={() => carregarDados(modulo, periodo)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {data && (
        <>
          {/* ========================================================================= */}
          {/* 3. CARTÕES DE INDICADORES (KPIS)                                          */}
          {/* ========================================================================= */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            
            {/* KPI 1: Chamados em Aberto */}
            <div className="bg-white rounded-2xl border border-slate-200/70 p-4 sm:p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Em Aberto
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                  <Inbox className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {kpis?.total_abertos ?? 0}
                </div>
                <div className="flex items-center gap-1 mt-1.5">
                  {(kpis?.variacao_vs_mes_anterior ?? 0) <= 0 ? (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      <TrendingDown className="w-3 h-3" />
                      {Math.abs(kpis?.variacao_vs_mes_anterior ?? 0)}%
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                      <TrendingUp className="w-3 h-3" />
                      +{kpis?.variacao_vs_mes_anterior}%
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400">vs. mês ant.</span>
                </div>
              </div>
            </div>

            {/* KPI 2: Valor Total em Aberto */}
            <div className="bg-white rounded-2xl border border-slate-200/70 p-4 sm:p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Valor em Aberto
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
                  <Banknote className="w-4 h-4 text-amber-600" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight truncate">
                  {formatarMoedaBR(kpis?.valor_total_aberto ?? 0, { showZero: true })}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Montante financeiro pendente</p>
              </div>
            </div>

            {/* KPI 3: SLA Estourado */}
            <div className="bg-white rounded-2xl border border-slate-200/70 p-4 sm:p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  SLA Estourado
                </span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 tracking-tight">
                    {kpis?.total_sla_estourado ?? 0}
                  </span>
                  <span className="text-xs font-bold text-rose-500">
                    ({kpis?.perc_sla_estourado ?? 0}%)
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  <span className="text-[11px] font-semibold text-rose-600">Acima de 60 dias</span>
                </div>
              </div>
            </div>

            {/* KPI 4: Concluídos no Mês */}
            <div className="bg-white rounded-2xl border border-slate-200/70 p-4 sm:p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Concluídos no Mês
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {kpis?.concluidos_mes_atual ?? 0}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Finalizados no mês corrente</p>
              </div>
            </div>

            {/* KPI 5: Tempo Médio de Resolução */}
            <div className="bg-white rounded-2xl border border-slate-200/70 p-4 sm:p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  Tempo Resolução
                </span>
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100">
                  <Clock className="w-4 h-4 text-sky-600" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {kpis?.tempo_medio_resolucao_dias ?? 0} <span className="text-sm font-semibold text-slate-500">dias</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Ciclo médio de atendimento</p>
              </div>
            </div>

            {/* KPI 6: % Dentro do Prazo */}
            <div className="bg-white rounded-2xl border border-slate-200/70 p-4 sm:p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  No Prazo (SLA)
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 tracking-tight">
                  {kpis?.perc_dentro_do_prazo ?? 0}%
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-semibold text-emerald-700">Resolvidos ≤ 60d</span>
                </div>
              </div>
            </div>

          </section>

          {/* ========================================================================= */}
          {/* 4. GRÁFICOS PRINCIPAIS: EVOLUÇÃO MENSAL E DISTRIBUIÇÃO                    */}
          {/* ========================================================================= */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* GRÁFICO 1: EVOLUÇÃO MENSAL (ABERTOS X CONCLUÍDOS) */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/70 p-5 sm:p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    Evolução Mensal: Abertos vs Concluídos
                  </h2>
                  <p className="text-xs text-slate-500">
                    Comparativo histórico de novas entradas versus resoluções por mês
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <span className="inline-flex items-center gap-1.5 text-slate-600">
                    <span className="w-3 h-3 rounded-sm bg-[#047857]" />
                    Abertos
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-slate-600">
                    <span className="w-3 h-3 rounded-sm bg-[#0284c7]" />
                    Concluídos
                  </span>
                </div>
              </div>

              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.evolucaoMensal}
                    margin={{ top: 15, right: 10, left: -15, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="mes_label"
                      tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                    />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} domain={[0, "auto"]} />
                    <Tooltip
                      cursor={{ fill: "rgba(4, 120, 87, 0.05)" }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl text-xs shadow-lg space-y-1.5 min-w-[140px]">
                              <p className="font-bold border-b border-slate-700 pb-1">{d.mes_label}</p>
                              <div className="flex justify-between items-center text-emerald-400">
                                <span>Abertos:</span>
                                <strong>{d.abertos}</strong>
                              </div>
                              <div className="flex justify-between items-center text-sky-400">
                                <span>Concluídos:</span>
                                <strong>{d.concluidos}</strong>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="abertos"
                      name="Abertos"
                      fill="#047857"
                      radius={[4, 4, 0, 0]}
                      barSize={18}
                    />
                    <Bar
                      dataKey="concluidos"
                      name="Concluídos"
                      fill="#0284c7"
                      radius={[4, 4, 0, 0]}
                      barSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Total de movimentações no período selecionado</span>
                <span className="font-bold text-slate-700">
                  {kpis?.total_chamados_periodo ?? 0} chamados no escopo
                </span>
              </div>
            </div>

            {/* GRÁFICO 2: DISTRIBUIÇÃO RECALL X FALTAS E SOBRAS (DONUT) */}
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 sm:p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between">
              <div className="mb-2 pb-3 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Distribuição por Módulo
                </h2>
                <p className="text-xs text-slate-500">
                  Proporção de chamados ativos entre os módulos
                </p>
              </div>

              <div className="h-48 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.distribuicaoModulos}
                      dataKey="abertos"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {data.distribuicaoModulos.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-lg space-y-1">
                              <p className="font-bold text-white border-b border-slate-700 pb-1">{d.label}</p>
                              <p>Em Aberto: <strong>{d.abertos}</strong> ({d.percentual}%)</p>
                              <p className="text-emerald-400 font-mono">
                                {formatarMoedaBR(d.valor_aberto, { showZero: true })}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Texto Central do Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-900">{kpis?.total_abertos ?? 0}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Abertos</span>
                </div>
              </div>

              {/* Legenda Customizada */}
              <div className="space-y-2.5 pt-3 border-t border-slate-100">
                {data.distribuicaoModulos.map((m) => (
                  <div key={m.modulo} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.fill }} />
                      <span className="font-semibold text-slate-700">{m.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-500">{formatarMoedaBR(m.valor_aberto, { showZero: true })}</span>
                      <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                        {m.abertos} ({m.percentual}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </section>

          {/* ========================================================================= */}
          {/* 5. SEGUNDA LINHA: TAREFAS ATUAIS E IDADE DOS CHAMADOS                     */}
          {/* ========================================================================= */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* GRÁFICO 3: CHAMADOS POR TAREFA ATUAL */}
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 sm:p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between">
              <div className="mb-4 pb-3 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Chamados por Tarefa Atual
                </h2>
                <p className="text-xs text-slate-500">
                  Etapa onde os chamados em aberto estão estacionados
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={data.tarefas.slice(0, 7)}
                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="2 2" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} />
                    <YAxis
                      type="category"
                      dataKey="tarefa"
                      tick={{ fontSize: 10, fill: "#475569", fontWeight: 600 }}
                      width={160}
                      tickFormatter={(v) => (v.length > 24 ? `${v.substring(0, 22)}...` : v)}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-lg space-y-1">
                              <p className="font-bold border-b border-slate-700 pb-1">{d.tarefa}</p>
                              <p>Total em Aberto: <strong>{d.total}</strong> chamados</p>
                              <p className="text-emerald-400 font-mono">
                                {formatarMoedaBR(d.valor_total, { showZero: true })}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="total"
                      fill="#20352d"
                      radius={[0, 6, 6, 0]}
                      barSize={16}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Concentração por etapa de fluxo</span>
                <span className="font-bold text-slate-700">{data.tarefas.length} tarefas com pendências</span>
              </div>
            </div>

            {/* GRÁFICO 4: IDADE DOS CHAMADOS POR FAIXA (SLA) */}
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 sm:p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between">
              <div className="mb-4 pb-3 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Idade dos Chamados em Aberto
                </h2>
                <p className="text-xs text-slate-500">
                  Distribuição temporal dos chamados por faixas de dias em aberto
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.faixasIdade}
                    margin={{ top: 20, right: 15, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#475569", fontWeight: 600 }}
                    />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} domain={[0, "auto"]} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-lg space-y-1">
                              <p className="font-bold border-b border-slate-700 pb-1">{d.label}</p>
                              <p>{d.dias_label}</p>
                              <p className="text-emerald-400">Total: <strong>{d.quantidade}</strong> chamados ({d.percentual}%)</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="quantidade"
                      radius={[6, 6, 0, 0]}
                      barSize={32}
                    >
                      {data.faixasIdade.map((f) => (
                        <Cell key={f.faixa} fill={f.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                {data.faixasIdade.map((f) => (
                  <div key={f.faixa} className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block">{f.label}</span>
                    <strong className="text-sm font-extrabold text-slate-900">{f.quantidade}</strong>
                    <span className="text-[10px] text-slate-500 block">({f.percentual}%)</span>
                  </div>
                ))}
              </div>
            </div>

          </section>

          {/* ========================================================================= */}
          {/* 6. TERCEIRA LINHA: TOP 6 LOJAS E CHAMADOS POR CD                          */}
          {/* ========================================================================= */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* TOP 6 LOJAS POR VALOR EM ABERTO (2 colunas) */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/70 p-5 sm:p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between">
              <div className="mb-4 pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    Top 6 Lojas por Valor em Aberto
                  </h2>
                  <p className="text-xs text-slate-500">
                    Lojas com maior impacto financeiro pendente de resolução
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  Ranking Financeiro
                </span>
              </div>

              <div className="space-y-3">
                {data.topLojas.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Nenhuma loja com pendências registradas.</p>
                ) : (
                  data.topLojas.map((loja, idx) => (
                    <div
                      key={loja.loja}
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            idx === 0
                              ? "bg-amber-100 text-amber-800"
                              : idx === 1
                              ? "bg-slate-200 text-slate-700"
                              : idx === 2
                              ? "bg-amber-50 text-amber-900"
                              : "bg-slate-100 text-slate-600"
                          }`}>
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-slate-900">Loja {loja.loja}</span>
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            {loja.tipo}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500">{loja.total_chamados} chamados</span>
                          <span className="font-bold font-mono text-slate-900">
                            {formatarMoedaBR(loja.valor_total, { showZero: true })}
                          </span>
                        </div>
                      </div>
                      {/* Barra de Progresso Proporcional */}
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-600"
                          style={{ width: `${Math.max(8, loja.percentual_do_max)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between items-center">
                <span>Concentração dos maiores valores retidos</span>
                <span className="font-semibold text-slate-700">6 maiores lojas</span>
              </div>
            </div>

            {/* CHAMADOS POR CD (1 coluna) */}
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 sm:p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between">
              <div className="mb-4 pb-3 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Chamados por Centro de Distribuição
                </h2>
                <p className="text-xs text-slate-500">
                  Distribuição geográfica das ocorrências
                </p>
              </div>

              <div className="space-y-3">
                {data.cds.map((c) => (
                  <div
                    key={c.cd}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                          {c.cd}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">CD {c.cd}</span>
                          <span className="text-[10px] text-slate-400">Total histórico: {c.total_chamados}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-900 block">{c.total_abertos} abertos</span>
                        <span className="text-[11px] font-mono text-emerald-700 font-semibold block">
                          {formatarMoedaBR(c.valor_aberto, { showZero: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between items-center">
                <span>Centros operacionais ativos</span>
                <span className="font-bold text-slate-700">{data.cds.length} CDs</span>
              </div>
            </div>

          </section>

          {/* ========================================================================= */}
          {/* 7. TABELA: CHAMADOS EM ABERTO MAIS ANTIGOS (COM LINK PARA CONSULTA)       */}
          {/* ========================================================================= */}
          <section className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    Chamados em Aberto Mais Antigos
                  </h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60">
                    Atenção Prioritária
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lista dos 10 chamados com maior tempo em aberto sem finalização
                </p>
              </div>

              <span className="text-xs text-slate-400">
                Ordenado por data de abertura (mais antigo primeiro)
              </span>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-slate-500 font-bold uppercase tracking-wider text-[11px]">Chamado</th>
                    <th className="px-4 py-3 text-slate-500 font-bold uppercase tracking-wider text-[11px]">Módulo</th>
                    <th className="px-4 py-3 text-slate-500 font-bold uppercase tracking-wider text-[11px]">Loja</th>
                    <th className="px-4 py-3 text-center text-slate-500 font-bold uppercase tracking-wider text-[11px]">CD</th>
                    <th className="px-4 py-3 text-slate-500 font-bold uppercase tracking-wider text-[11px]">Abertura</th>
                    <th className="px-4 py-3 text-center text-slate-500 font-bold uppercase tracking-wider text-[11px]">Dias em Aberto</th>
                    <th className="px-4 py-3 text-slate-500 font-bold uppercase tracking-wider text-[11px]">Tarefa Atual</th>
                    <th className="px-4 py-3 text-right text-slate-500 font-bold uppercase tracking-wider text-[11px]">Valor</th>
                    <th className="px-4 py-3 text-center text-slate-500 font-bold uppercase tracking-wider text-[11px]">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.chamadosAntigos.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        Nenhum chamado em aberto encontrado no filtro selecionado.
                      </td>
                    </tr>
                  ) : (
                    data.chamadosAntigos.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {c.chamado}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.modulo === "recall"
                              ? "bg-cyan-50 text-cyan-800 border border-cyan-200/60"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200/60"
                          }`}>
                            {c.modulo_label}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-700">
                          Loja {c.loja}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px]">
                            {c.cd}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-medium whitespace-nowrap">
                          {fmtBR(c.dt_abertura)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            c.dias_aberto > 60
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : c.dias_aberto >= 45
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}>
                            {c.dias_aberto} dias {c.dias_aberto > 60 && "(Atraso)"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-medium">
                          {c.tarefa_atual}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatarMoedaBR(c.valor, { showZero: true })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <a
                            href={`/?submenu=${c.modulo === "recall" ? "recall_consulta" : "consulta"}&chamado=${c.chamado}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-semibold text-[11px] border border-slate-200 transition-colors"
                            title="Abrir este chamado na tela de Consulta"
                          >
                            <span>Ver na consulta</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50/50 border-t border-slate-100 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                Esta tela opera exclusivamente em modo leitura. Modificações devem ser feitas na tela de Consulta.
              </span>
              <span className="font-semibold text-slate-700">
                10 chamados exibidos
              </span>
            </div>
          </section>

        </>
      )}

    </div>
  );
}
