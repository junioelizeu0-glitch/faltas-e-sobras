import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  AlertTriangle, Clock, CheckCircle2, Search, FileText, Loader2, X,
  ChevronDown, RefreshCcw, Download, Paperclip, ChevronLeft, ChevronRight,
  Filter, Eye, Pencil, Building2, Store, LayoutGrid, Layers, ListChecks
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList
} from "recharts";
import { parseDataBR, getBusinessDays } from "@/lib/data-processing";
import ChamadoForm from "./ChamadoForm";
import { listLojas, type Loja } from "@/lib/lojas.functions";
import { useServerFn } from "@tanstack/react-start";
import { toPng } from "html-to-image";

type Props = {
  rawData: any[] | undefined;
  isLoading?: boolean;
  error?: string | null;
  onChanged?: () => void;
};

const SLA_LIMITE = 60; // dias úteis
const SLA_ATENCAO = 45;

const fmtBR = (v: any) => {
  if (!v) return "—";
  const s = String(v);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = parseDataBR(s);
  if (!d) return s;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

function isFinalizado(r: any) {
  const dtFin = String(r["Dt Finalização"] || r.dt_finalizacao || "").trim();
  return dtFin !== "";
}

function siglaCD(v: any): string {
  const s = String(v ?? "").toUpperCase();
  const m = s.match(/\b(ES|PB)\b/);
  if (m) return m[1];
  if (s.includes("ES")) return "ES";
  if (s.includes("PB")) return "PB";
  return "";
}

// Cores dinâmicas para gráficos
const CHART_PALETTE = [
  "#06b6d4", // ciano
  "#22c55e", // verde
  "#f97316", // laranja
  "#a855f7", // roxo
  "#eab308", // amarelo
  "#ec4899", // rosa
  "#3b82f6", // azul
  "#84cc16", // verde lima
  "#6366f1", // índigo
  "#64748b", // slate
];

export default function PainelAbertos({ rawData, isLoading, error, onChanged }: Props) {
  // Estados dos painéis retráteis
  const [isGraficosOpen, setIsGraficosOpen] = useState(true);
  const [isAtividadesOpen, setIsAtividadesOpen] = useState(true);

  // Mapeamento de lojas para Franquia vs Própria
  const [lojasMap, setLojasMap] = useState<Record<string, string>>({});
  const getLojasFn = useServerFn(listLojas);

  useEffect(() => {
    getLojasFn()
      .then((data) => {
        if (data && Array.isArray(data)) {
          const map: Record<string, string> = {};
          data.forEach((l) => {
            const num = String(l.numero || "").trim();
            const rz = String(l.razao_social || "").trim().toLowerCase();
            const tp = String(l.tipo || "").trim();
            if (num) map[num] = tp;
            if (rz) map[rz] = tp;
          });
          setLojasMap(map);
        }
      })
      .catch(() => {});
  }, []);

  // Determinar o Tipo de Loja (Franquia vs Própria)
  const classifyTipoLoja = (r: any): "Franquia" | "Própria" | "Geral" => {
    const lojaVal = String(r.Loja || r.loja || "").trim();
    if (lojasMap[lojaVal]) {
      const tp = lojasMap[lojaVal].toLowerCase();
      if (tp.includes("propria") || tp.includes("própria")) return "Própria";
      if (tp.includes("franquia")) return "Franquia";
    }
    const valUpper = lojaVal.toUpperCase();
    if (valUpper.includes("PROPRIA") || valUpper.includes("PRÓPRIA")) return "Própria";
    if (valUpper.includes("FRANQUIA") || valUpper.includes("FRANQ")) return "Franquia";

    const tpCampo = String(r.tipo_loja || r["Tipo de Loja"] || "").toLowerCase();
    if (tpCampo.includes("propria") || tpCampo.includes("própria")) return "Própria";
    if (tpCampo.includes("franquia")) return "Franquia";

    return "Franquia";
  };

  // Filtros da tabela de atividades
  const [query, setQuery] = useState("");
  const [cdFilter, setCdFilter] = useState<"Todos" | "ES" | "PB">("Todos");
  const [alertaFilter, setAlertaFilter] = useState<"todos" | "vencido" | "atencao" | "prazo">("todos");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [tarefaFilter, setTarefaFilter] = useState<string>("Todas");
  const [lojaFilter, setLojaFilter] = useState<string>("Todas");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Estado do Modal de Pré-Lista (Drill-down dos gráficos)
  const [isDrillOpen, setIsDrillOpen] = useState(false);
  const [drillTitle, setDrillTitle] = useState("");
  const [drillRows, setDrillRows] = useState<any[]>([]);
  const [drillBusca, setDrillBusca] = useState("");

  // Refs para exportação de imagem dos gráficos
  const chart1Ref = useRef<HTMLDivElement>(null);
  const chart2Ref = useRef<HTMLDivElement>(null);
  const chart3Ref = useRef<HTMLDivElement>(null);

  const handleExportChart = async (ref: React.RefObject<HTMLDivElement | null>, filename: string) => {
    if (!ref.current) return;
    try {
      const dataUrl = await toPng(ref.current, {
        cacheBust: true,
        backgroundColor: "#ffffff",
        pixelRatio: 2
      });
      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Erro ao exportar gráfico:", err);
    }
  };

  // Dados processados dos chamados em aberto (Apenas NÃO FINALIZADOS)
  const rows = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    const inicioAno = new Date(hoje.getFullYear(), 0, 1, 0, 0, 0, 0);
    return (rawData || [])
      .filter((r) => {
        if (isFinalizado(r)) return false;
        const dtAb = parseDataBR(r["Dt Abertura"]);
        if (!dtAb) return false;
        return dtAb >= inicioAno && dtAb <= hoje;
      })
      .map((r) => {
        const dtAb = parseDataBR(r["Dt Abertura"]);
        const dias = dtAb ? getBusinessDays(dtAb, hoje) : 0;
        let alerta: "vencido" | "atencao" | "prazo" = "prazo";
        if (dias > SLA_LIMITE) alerta = "vencido";
        else if (dias >= SLA_ATENCAO) alerta = "atencao";
        const tipoLoja = classifyTipoLoja(r);

        return {
          id: r.id || r._id || r.Chamado,
          chamado: r.Chamado,
          loja: r.Loja || "—",
          tipoLoja,
          cd: siglaCD(r.CD),
          tipo: r.Tipo || "Falta/Sobra",
          tarefa: (String(r["Situação "] ?? r["Situação"] ?? r.situacao ?? "").trim()) || "Monitoramento",
          status: r["Status Chamado"] || "Em Aberto",
          dtAbertura: r["Dt Abertura"],
          dias,
          alerta,
          raw: r
        };
      })
      .sort((a, b) => b.dias - a.dias);
  }, [rawData, lojasMap]);

  // Opções de seletores
  const statusOpts = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => { if (r.status) s.add(String(r.status)); });
    return ["Todos", ...Array.from(s).sort()];
  }, [rows]);
  const tarefaOpts = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => { if (r.tarefa && r.tarefa !== "—") s.add(r.tarefa); });
    return ["Todas", ...Array.from(s).sort()];
  }, [rows]);
  const lojaOpts = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => { if (r.loja) s.add(String(r.loja)); });
    return ["Todas", ...Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }))];
  }, [rows]);

  // Filtro principal de chamados
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (cdFilter !== "Todos" && r.cd !== cdFilter) return false;
      if (alertaFilter !== "todos" && r.alerta !== alertaFilter) return false;
      if (statusFilter !== "Todos" && String(r.status) !== statusFilter) return false;
      if (tarefaFilter !== "Todas" && r.tarefa !== tarefaFilter) return false;
      if (lojaFilter !== "Todas" && String(r.loja) !== lojaFilter) return false;
      if (!q) return true;
      return (
        String(r.chamado).toLowerCase().includes(q) ||
        String(r.loja).toLowerCase().includes(q) ||
        String(r.tarefa).toLowerCase().includes(q) ||
        String(r.status).toLowerCase().includes(q) ||
        String(r.tipo).toLowerCase().includes(q)
      );
    });
  }, [rows, query, cdFilter, alertaFilter, statusFilter, tarefaFilter, lojaFilter]);

  const counts = useMemo(() => {
    const c = { total: rows.length, vencido: 0, atencao: 0, prazo: 0 };
    rows.forEach((r) => { c[r.alerta] += 1; });
    return c;
  }, [rows]);

  // =========================================================================
  // GRÁFICOS (APENAS COM DADOS VÁLIDOS, SEM MESES COM TOTAL 0)
  // =========================================================================

  // GRÁFICO 1: Controle de Eventos (Apenas Não Finalizados e Mês > 0)
  const controleEventosData = useMemo(() => {
    const monthCounts: Record<string, { monthLabel: string; yearMonth: string; total: number; vencidos: number }> = {};
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      const label = `${mStr.charAt(0).toUpperCase() + mStr.slice(1)}/${String(d.getFullYear()).slice(2)}`;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthCounts[key] = { monthLabel: label, yearMonth: key, total: 0, vencidos: 0 };
    }

    rows.forEach((r) => {
      const dt = parseDataBR(r.dtAbertura);
      if (!dt) return;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      if (monthCounts[key]) {
        monthCounts[key].total += 1;
        if (r.alerta === "vencido") {
          monthCounts[key].vencidos += 1;
        }
      }
    });

    // IGNORAR MESES SEM INFORMAÇÃO (TOTAL === 0)
    return Object.values(monthCounts)
      .filter((item) => item.total > 0)
      .map((item, idx) => ({
        name: item.monthLabel,
        yearMonth: item.yearMonth,
        total: item.total,
        vencidos: item.vencidos,
        fill: CHART_PALETTE[idx % CHART_PALETTE.length]
      }));
  }, [rows]);

  // GRÁFICO 2: Tarefas em Aberto (Filtrar apenas chamados em aberto por tarefa)
  const tarefasEmAbertoData = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach((r) => {
      const t = r.tarefa || "Outros";
      map[t] = (map[t] || 0) + 1;
    });

    return Object.entries(map)
      .map(([tarefaName, total], idx) => ({
        name: tarefaName.length > 18 ? `${tarefaName.substring(0, 16)}...` : tarefaName,
        fullTarefName: tarefaName,
        total,
        fill: CHART_PALETTE[(idx + 2) % CHART_PALETTE.length]
      }))
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [rows]);

  // GRÁFICO 3: Chamados por Tipo de Loja (Franquia vs Própria)
  const chamadosPorTipoLojaData = useMemo(() => {
    let franquiaCount = 0;
    let propriaCount = 0;
    let geralCount = 0;

    rows.forEach((r) => {
      if (r.tipoLoja === "Franquia") franquiaCount++;
      else if (r.tipoLoja === "Própria") propriaCount++;
      else geralCount++;
    });

    return [
      { name: "Franquias", categoryKey: "Franquia", total: franquiaCount, fill: "#06b6d4" },
      { name: "Lojas Próprias", categoryKey: "Própria", total: propriaCount, fill: "#a855f7" },
      ...(geralCount > 0 ? [{ name: "Outras / Geral", categoryKey: "Geral", total: geralCount, fill: "#64748b" }] : [])
    ].filter((item) => item.total > 0);
  }, [rows]);

  // =========================================================================
  // HANDLERS PARA DRILL-DOWN / CLIQUE NOS GRÁFICOS
  // =========================================================================
  const handleChart1Click = (data: any) => {
    if (!data || !data.yearMonth) return;
    const key = data.yearMonth;
    const name = data.name;

    const list = rows.filter((r) => {
      const dt = parseDataBR(r.dtAbertura);
      if (!dt) return false;
      const rKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      return rKey === key;
    });

    setDrillTitle(`Chamados Abertos em ${name} (${list.length} chamados)`);
    setDrillRows(list);
    setDrillBusca("");
    setIsDrillOpen(true);
  };

  const handleChartTarefasClick = (data: any) => {
    if (!data || !data.fullTarefName) return;
    const tName = data.fullTarefName;
    const list = rows.filter((r) => r.tarefa === tName);

    setDrillTitle(`Tarefas em Aberto: ${tName} (${list.length} chamados)`);
    setDrillRows(list);
    setDrillBusca("");
    setIsDrillOpen(true);
  };

  const handleChartTipoLojaClick = (data: any) => {
    if (!data || !data.categoryKey) return;
    const cat = data.categoryKey;
    const name = data.name;

    const list = rows.filter((r) => r.tipoLoja === cat || (cat === "Geral" && r.tipoLoja !== "Franquia" && r.tipoLoja !== "Própria"));

    setDrillTitle(`Chamados de Lojas: ${name} (${list.length} chamados)`);
    setDrillRows(list);
    setDrillBusca("");
    setIsDrillOpen(true);
  };

  // Filtragem interna da Pré-lista no modal
  const filteredDrillRows = useMemo(() => {
    const q = drillBusca.trim().toLowerCase();
    if (!q) return drillRows;
    return drillRows.filter(
      (r) =>
        String(r.chamado).toLowerCase().includes(q) ||
        String(r.loja).toLowerCase().includes(q) ||
        String(r.tarefa).toLowerCase().includes(q) ||
        String(r.status).toLowerCase().includes(q) ||
        String(r.tipo).toLowerCase().includes(q)
    );
  }, [drillRows, drillBusca]);

  // Paginação expandida para mais chamados na tela
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50); // Padrão 50 itens
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [query, cdFilter, alertaFilter, statusFilter, tarefaFilter, lojaFilter, pageSize]);

  return (
    <div className="min-h-screen bg-[#F4F6F5] p-4 md:p-6 space-y-6 text-slate-800 font-sans">

      {/* ========================================================================= */}
      {/* 1. SEÇÃO RETRÁTIL: GRÁFICOS LIMPOS (APENAS COM INFORMAÇÃO REAL)           */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_2px_10px_rgba(0,0,0,0.03)] transition-all overflow-hidden">
        {/* Cabeçalho do Card Gráficos */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white select-none">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Gráficos</h2>
          </div>
          <button
            onClick={() => setIsGraficosOpen(!isGraficosOpen)}
            className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer"
            title={isGraficosOpen ? "Recolher Gráficos" : "Expandir Gráficos"}
          >
            <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isGraficosOpen ? "" : "rotate-180"}`} />
          </button>
        </div>

        {/* Conteúdo Expandível dos Gráficos */}
        {isGraficosOpen && (
          <div className="p-5 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-50/40">

            {/* GRÁFICO 1: CONTROLE DE EVENTOS (NÃO FINALIZADOS E APENAS MESES COM DADOS) */}
            <div ref={chart1Ref} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between relative">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Controle de Eventos (Não Finalizados)</h3>
                  <p className="text-xs text-slate-500">Volume por mês de abertura e controle SLA (&gt;60D)</p>
                </div>
                <button
                  onClick={() => handleExportChart(chart1Ref, "controle-eventos")}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Baixar Gráfico"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

              <div className="h-60 w-full mt-2 cursor-pointer">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={controleEventosData} margin={{ top: 20, right: 10, left: -20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} angle={-35} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} domain={[0, "auto"]} />
                    <Tooltip
                      cursor={{ fill: "rgba(6, 182, 212, 0.08)" }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-lg space-y-1">
                              <p className="font-bold border-b border-slate-700 pb-1">{d.name}</p>
                              <p>Aberturas: <strong>{d.total}</strong> chamados</p>
                              <p className="text-rose-400">Atrasados (&gt;60D): <strong>{d.vencidos}</strong></p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="total"
                      radius={[6, 6, 0, 0]}
                      barSize={22}
                      onClick={(entry) => handleChart1Click(entry)}
                    >
                      <LabelList dataKey="total" position="top" style={{ fontSize: "11px", fontWeight: "bold", fill: "#334155" }} />
                      {controleEventosData.map((entry, index) => (
                        <Cell
                          key={`cell-c1-${index}`}
                          fill={entry.fill}
                          className="hover:opacity-80 transition-opacity cursor-pointer"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 font-medium">
                <span>Meses com chamados ativos</span>
                <span className="font-bold text-slate-700">Total: {counts.total}</span>
              </div>
            </div>

            {/* GRÁFICO 2: TAREFAS EM ABERTO */}
            <div ref={chart2Ref} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between relative">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Tarefas em Aberto</h3>
                  <p className="text-xs text-slate-500">Distribuição de chamados pendentes por etapa</p>
                </div>
                <button
                  onClick={() => handleExportChart(chart2Ref, "tarefas-em-aberto")}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Baixar Gráfico"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

              <div className="h-60 w-full mt-2 cursor-pointer">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tarefasEmAbertoData} margin={{ top: 20, right: 10, left: -20, bottom: 35 }}>
                    <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }} interval={0} angle={-45} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} domain={[0, "auto"]} />
                    <Tooltip
                      cursor={{ fill: "rgba(249, 115, 22, 0.08)" }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-lg space-y-1">
                              <p className="font-bold border-b border-slate-700 pb-1">{d.fullTarefName}</p>
                              <p>Total em Aberto: <strong>{d.total}</strong> chamados</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="total"
                      radius={[6, 6, 0, 0]}
                      barSize={22}
                      onClick={(entry) => handleChartTarefasClick(entry)}
                    >
                      <LabelList dataKey="total" position="top" style={{ fontSize: "11px", fontWeight: "bold", fill: "#334155" }} />
                      {tarefasEmAbertoData.map((entry, index) => (
                        <Cell
                          key={`cell-c2-${index}`}
                          fill={entry.fill}
                          className="hover:opacity-80 transition-opacity cursor-pointer"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 font-medium">
                <span>Por etapa atual do fluxo</span>
                <span className="font-bold text-slate-700">{tarefasEmAbertoData.length} etapas</span>
              </div>
            </div>

            {/* GRÁFICO 3: CHAMADOS POR TIPO DE LOJA (FRANQUIA VS PRÓPRIA) */}
            <div ref={chart3Ref} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between relative">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Chamados por Tipo de Loja</h3>
                  <p className="text-xs text-slate-500">Franquias vs Lojas Próprias</p>
                </div>
                <button
                  onClick={() => handleExportChart(chart3Ref, "chamados-por-tipo-loja")}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Baixar Gráfico"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

              <div className="h-60 w-full mt-2 cursor-pointer">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chamadosPorTipoLojaData} margin={{ top: 25, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: "bold", fill: "#475569" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} domain={[0, "auto"]} />
                    <Tooltip
                      cursor={{ fill: "rgba(168, 85, 247, 0.08)" }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-lg space-y-1">
                              <p className="font-bold border-b border-slate-700 pb-1">{d.name}</p>
                              <p>Total de Chamados: <strong>{d.total}</strong></p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="total"
                      radius={[6, 6, 0, 0]}
                      barSize={40}
                      onClick={(entry) => handleChartTipoLojaClick(entry)}
                    >
                      <LabelList dataKey="total" position="top" style={{ fontSize: "12px", fontWeight: "black", fill: "#1e293b" }} />
                      {chamadosPorTipoLojaData.map((entry, index) => (
                        <Cell
                          key={`cell-c3-${index}`}
                          fill={entry.fill}
                          className="hover:opacity-80 transition-opacity cursor-pointer"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 font-medium">
                <span>Modelo corporativo</span>
                <span className="font-bold text-slate-700">Franquias vs Próprias</span>
              </div>
            </div>

          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 2. SEÇÃO RETRÁTIL: ATIVIDADES A SEREM REALIZADAS (GRID EXIBIDO COMPLETO)   */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_2px_10px_rgba(0,0,0,0.03)] transition-all overflow-hidden">

        {/* Cabeçalho Limpo: Mantida APENAS a Setinha de Atualizar e o Botão de Recolher */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white select-none">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Atividades a serem realizadas
            </h2>
          </div>

          <div className="flex items-center gap-3 text-slate-600">
            <button
              onClick={() => onChanged?.()}
              className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer border border-slate-200/60 flex items-center gap-1.5 text-xs font-semibold"
              title="Atualizar Chamados"
            >
              <RefreshCcw className="w-4 h-4 text-emerald-600" />
              <span>Atualizar</span>
            </button>

            <button
              onClick={() => setIsAtividadesOpen(!isAtividadesOpen)}
              className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer"
              title={isAtividadesOpen ? "Recolher Atividades" : "Expandir Atividades"}
            >
              <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isAtividadesOpen ? "" : "rotate-180"}`} />
            </button>
          </div>
        </div>

        {/* Conteúdo Expandível da Tabela (Grid Exibido de Forma Fluida Sem Truncamento) */}
        {isAtividadesOpen && (
          <div className="p-5 md:p-6 space-y-4 bg-white">

            {/* Barra Superior de KPIs de Status + Campo Pesquisar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-100">

              {/* Badges de Pílulas de KPI com Ponto Indicador */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setAlertaFilter("todos")}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    alertaFilter === "todos"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span>Em Aberto</span>
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-700 text-white font-bold">
                    {counts.total}
                  </span>
                </button>

                <button
                  onClick={() => setAlertaFilter("prazo")}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    alertaFilter === "prazo"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200/60 hover:bg-emerald-100"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>No Prazo</span>
                  <span className="font-bold">({counts.prazo})</span>
                </button>

                <button
                  onClick={() => setAlertaFilter("atencao")}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    alertaFilter === "atencao"
                      ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                      : "bg-amber-50 text-amber-700 border-amber-200/60 hover:bg-amber-100"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span>Atenção (≥45D)</span>
                  <span className="font-bold">({counts.atencao})</span>
                </button>

                <button
                  onClick={() => setAlertaFilter("vencido")}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    alertaFilter === "vencido"
                      ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                      : "bg-rose-50 text-rose-700 border-rose-200/60 hover:bg-rose-100"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  <span>Vencidos (&gt;60D)</span>
                  <span className="font-bold">({counts.vencido})</span>
                </button>
              </div>

              {/* Campo Pesquisar Alinhado à Direita */}
              <div className="flex items-center gap-3">
                <div className="relative w-64 md:w-80">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Pesquisar chamado, loja, tarefa..."
                    className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 shadow-2xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Filtros em Linha + Seletor de Quantidade de Chamados por Tela */}
            <div className="flex flex-wrap items-center gap-3 py-2 px-3 bg-slate-50/70 rounded-xl border border-slate-200/60 text-xs">
              <div className="flex items-center gap-1.5 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <Filter className="w-3.5 h-3.5 text-emerald-700" /> Filtros:
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[11px]">CD:</span>
                <select
                  value={cdFilter}
                  onChange={(e) => setCdFilter(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-emerald-500"
                >
                  <option value="Todos">Todos os CDs</option>
                  <option value="ES">ES</option>
                  <option value="PB">PB</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[11px]">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-emerald-500"
                >
                  {statusOpts.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[11px]">Tarefa:</span>
                <select
                  value={tarefaFilter}
                  onChange={(e) => setTarefaFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-emerald-500 max-w-[180px]"
                >
                  {tarefaOpts.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[11px]">Loja:</span>
                <select
                  value={lojaFilter}
                  onChange={(e) => setLojaFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-emerald-500 max-w-[160px]"
                >
                  {lojaOpts.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              {/* Seletor de Quantidade de Chamados na Tela */}
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-slate-500 text-[11px]">Exibir:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 outline-none cursor-pointer focus:border-emerald-500"
                >
                  <option value={25}>25 por tela</option>
                  <option value={50}>50 por tela</option>
                  <option value={100}>100 por tela</option>
                  <option value={9999}>Todos ({filtered.length})</option>
                </select>
              </div>
            </div>

            {/* TABELA DE ATIVIDADES COM BARRA DE ROLAGEM INTERNA E CABEÇALHO FIXO */}
            <div className="w-full overflow-auto max-h-[520px] border border-slate-200/80 rounded-xl bg-white shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/95 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 sticky top-0 bg-slate-50 z-10 shadow-2xs">
                  <tr>
                    <th className="px-4 py-3 w-12 text-slate-400">#</th>
                    <th className="px-4 py-3 w-28">Status</th>
                    <th className="px-4 py-3 w-14 text-center">Anexo</th>
                    <th className="px-4 py-3 min-w-[160px]">Nome / Loja</th>
                    <th className="px-4 py-3 w-28 text-center">Tipo Loja</th>
                    <th className="px-4 py-3 min-w-[130px]">Evento</th>
                    <th className="px-4 py-3 w-28">Data abertura</th>
                    <th className="px-4 py-3 w-20 text-right">Dias</th>
                    <th className="px-4 py-3 w-24 text-center">Cobertura</th>
                    <th className="px-4 py-3 min-w-[180px]">Tarefa</th>
                    <th className="px-4 py-3 w-28 text-center">Duração</th>
                    <th className="px-4 py-3 w-20 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {isLoading && (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                        <span>Carregando atividades em aberto...</span>
                      </td>
                    </tr>
                  )}

                  {!isLoading && error && (
                    <tr>
                      <td colSpan={12} className="py-10 text-center text-rose-600 font-medium">
                        Não foi possível carregar os chamados. Tente recarregar.
                      </td>
                    </tr>
                  )}

                  {!isLoading && !error && pageRows.length === 0 && (
                    <tr>
                      <td colSpan={12} className="py-10 text-center text-slate-400">
                        Nenhuma atividade encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  )}

                  {!isLoading && !error && pageRows.map((r, i) => {
                    const rowIdx = (page - 1) * pageSize + i + 1;
                    return (
                      <tr
                        key={`${r.chamado}-${i}`}
                        onClick={() => r.id && setEditingId(String(r.id))}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        {/* # Index / ID */}
                        <td className="px-4 py-3.5 font-semibold text-slate-400 text-[11px]">
                          {rowIdx}
                        </td>

                        {/* Status Badge estilo Pílula com Ponto Indicador */}
                        <td className="px-4 py-3.5">
                          <StatusPill alerta={r.alerta} statusText={r.status} />
                        </td>

                        {/* Anexo Ícone */}
                        <td className="px-4 py-3.5 text-center">
                          <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 group-hover:text-emerald-700 group-hover:bg-emerald-50 transition-colors">
                            <Paperclip className="w-3.5 h-3.5" />
                          </div>
                        </td>

                        {/* Nome / Loja */}
                        <td className="px-4 py-3.5 font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                          <div className="flex flex-col">
                            <span>{r.loja}</span>
                            <span className="text-[10px] text-slate-400 font-normal">Nº {r.chamado}</span>
                          </div>
                        </td>

                        {/* Tipo de Loja: Franquia vs Própria */}
                        <td className="px-4 py-3.5 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${
                            r.tipoLoja === "Franquia"
                              ? "bg-cyan-50 text-cyan-700 border-cyan-200"
                              : "bg-purple-50 text-purple-700 border-purple-200"
                          }`}>
                            {r.tipoLoja}
                          </span>
                        </td>

                        {/* Evento (Tipo de Chamado) */}
                        <td className="px-4 py-3.5 font-medium text-slate-600">
                          {r.tipo}
                        </td>

                        {/* Data Abertura */}
                        <td className="px-4 py-3.5 font-medium text-slate-600 whitespace-nowrap">
                          {fmtBR(r.dtAbertura)}
                        </td>

                        {/* Dias decorridos (SLA) */}
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-800">
                          {r.dias}d
                        </td>

                        {/* Cobertura (CD) */}
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px] border border-slate-200/60">
                            {r.cd || "Geral"}
                          </span>
                        </td>

                        {/* Tarefa Atual */}
                        <td className="px-4 py-3.5 font-medium text-slate-700">
                          {r.tarefa}
                        </td>

                        {/* Duração / SLA Pill */}
                        <td className="px-4 py-3.5 text-center">
                          <DuracaoPill dias={r.dias} />
                        </td>

                        {/* Botão Ações: Editar */}
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (r.id) setEditingId(String(r.id));
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 font-semibold text-[11px] transition-all cursor-pointer"
                            title="Editar Chamado"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Editar</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Controles de Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 px-2 text-xs text-slate-500 font-medium">
                <span>
                  Exibindo <strong>{pageRows.length}</strong> de <strong>{filtered.length}</strong> chamados (Página {page} de {totalPages})
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer font-semibold"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer font-semibold"
                  >
                    Próxima <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 3. MODAL DE PRÉ-LISTA DE CHAMADOS (DRILL-DOWN DOS GRÁFICOS)               */}
      {/* ========================================================================= */}
      {isDrillOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[88vh] flex flex-col border border-slate-200 overflow-hidden"
          >
            {/* Topo do Modal */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <LayoutGrid className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">{drillTitle}</h3>
              </div>
              <button
                onClick={() => setIsDrillOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Busca interna do Modal */}
            <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  value={drillBusca}
                  onChange={(e) => setDrillBusca(e.target.value)}
                  placeholder="Filtrar pré-lista por chamado, loja, tarefa..."
                  className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 shadow-2xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <span className="text-xs text-slate-500 font-semibold">
                {filteredDrillRows.length} chamados na lista
              </span>
            </div>

            {/* Tabela do Modal Pré-Lista */}
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200 sticky top-0 bg-slate-50">
                  <tr>
                    <th className="px-3 py-2">Chamado</th>
                    <th className="px-3 py-2">Loja</th>
                    <th className="px-3 py-2 text-center">Tipo Loja</th>
                    <th className="px-3 py-2">CD</th>
                    <th className="px-3 py-2">Dt Abertura</th>
                    <th className="px-3 py-2 text-right">Dias Úteis</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Tarefa Atual</th>
                    <th className="px-3 py-2 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredDrillRows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400">
                        Nenhum chamado encontrado para este filtro.
                      </td>
                    </tr>
                  )}

                  {filteredDrillRows.map((r, idx) => (
                    <tr key={`drill-${r.chamado}-${idx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2.5 font-bold text-slate-900">
                        Nº {r.chamado}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-800">
                        {r.loja}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          r.tipoLoja === "Franquia" ? "bg-cyan-50 text-cyan-700 border-cyan-200" : "bg-purple-50 text-purple-700 border-purple-200"
                        }`}>
                          {r.tipoLoja}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-600">
                        {r.cd || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                        {fmtBR(r.dtAbertura)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">
                        {r.dias}d
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusPill alerta={r.alerta} statusText={r.status} />
                      </td>
                      <td className="px-3 py-2.5 text-slate-700 font-medium">
                        {r.tarefa}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => {
                            setIsDrillOpen(false);
                            if (r.id) setEditingId(String(r.id));
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors cursor-pointer shadow-2xs"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Rodapé do Modal */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setIsDrillOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Fechar Pré-Lista
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL DE EDIÇÃO DE CHAMADO                                             */}
      {/* ========================================================================= */}
      {editingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] max-h-[90vh] overflow-auto border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold text-slate-900">Editar Chamado</h2>
              <button
                onClick={() => setEditingId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 md:p-6">
              <ChamadoForm
                mode="editar"
                chamadoId={editingId}
                compact
                onSaved={() => { onChanged?.(); }}
                onCancel={() => setEditingId(null)}
                onDeleted={() => { setEditingId(null); onChanged?.(); }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// --- SUBCOMPONENTES DE STATUS E DURAÇÃO CONFORME DESIGN SYSTEM ---
function StatusPill({ alerta, statusText }: { alerta: "vencido" | "atencao" | "prazo"; statusText: string }) {
  if (alerta === "vencido") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
        <span className="truncate max-w-[90px]">{statusText || "Vencido"}</span>
      </span>
    );
  }
  if (alerta === "atencao") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
        <span className="truncate max-w-[90px]">{statusText || "Atenção"}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
      <span className="truncate max-w-[90px]">{statusText || "No Prazo"}</span>
    </span>
  );
}

function DuracaoPill({ dias }: { dias: number }) {
  if (dias > SLA_LIMITE) {
    return <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">&gt; 60d (Atraso)</span>;
  }
  if (dias >= SLA_ATENCAO) {
    return <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">45d a 60d</span>;
  }
  return <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">&lt; 45d</span>;
}


