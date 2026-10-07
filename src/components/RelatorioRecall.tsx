import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, Line, AreaChart, Area
} from "recharts";
import {
  AlertTriangle, Clock, CheckCircle2, XCircle, Search, FileText, Loader2, X,
  ChevronDown, RefreshCcw, Download, Paperclip, ChevronLeft, ChevronRight,
  Filter, Eye, Pencil, Building2, Store, LayoutGrid, Layers, ListChecks,
  Brain, Sparkles, TrendingUp, ShieldAlert, DollarSign, Package, Truck,
  FileSpreadsheet, ArrowUpRight, ArrowDownRight, Activity, Target, Award
} from "lucide-react";
import {
  parseDataBR,
  getBusinessDays,
  parseValorNumeric,
  formatarMoedaBR,
  getTarefaAtual,
  FilterState
} from "@/lib/data-processing";
import { exportToExcel } from "@/lib/excel-export";
import { listLojas } from "@/lib/lojas.functions";
import { useServerFn } from "@tanstack/react-start";
import { toPng } from "html-to-image";
import DrillDownModal from "@/components/DrillDownModal";

type RelatorioRecallProps = {
  rawData: any[] | undefined;
  isLoading?: boolean;
  error?: string | null;
  onChanged?: () => void;
};

// Cores executivas alinhadas com o Design System (Emerald Executive Palette)
const COLOR_EMERALD = "#047857"; // Emerald 700
const COLOR_EMERALD_LIGHT = "#10b981"; // Emerald 500
const COLOR_SKY = "#0284c7"; // Sky 600
const COLOR_AMBER = "#d97706"; // Amber 600
const COLOR_ROSE = "#e11d48"; // Rose 600
const COLOR_PURPLE = "#7c3aed"; // Purple 600
const COLOR_SLATE = "#64748b"; // Slate 500

const PIE_COLORS = [COLOR_EMERALD, COLOR_SKY, COLOR_AMBER, COLOR_ROSE, COLOR_PURPLE, COLOR_SLATE];

const fmtBRDate = (v: any) => {
  if (!v) return "—";
  const s = String(v).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = parseDataBR(s);
  if (!d) return s;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

export default function RelatorioRecall({
  rawData = [],
  isLoading = false,
  error = null,
  onChanged,
}: RelatorioRecallProps) {
  // --- ESTADOS DE NAVEGAÇÃO E REFINAMENTO ---
  const [activeTab, setActiveTab] = useState<"resumo" | "origem" | "sla" | "tabela">("resumo");
  const [lojasMap, setLojasMap] = useState<Record<string, string>>({});
  const getLojasFn = useServerFn(listLojas);

  // Filtros Globais
  const [filters, setFilters] = useState<FilterState>({
    dateRef: "Ref: Data de Abertura",
    periodo: "Todos",
    dataInicio: "",
    dataFim: "",
    cd: "Todos",
    transp: "Todas",
    status: "Todos",
    tipo: "Todos",
  });

  // Busca Exata em Campos Específicos (Nº Chamado, Loja, NF, Produto)
  const [exactSearchChamado, setExactSearchChamado] = useState("");
  const [exactSearchLoja, setExactSearchLoja] = useState("");
  const [exactSearchNF, setExactSearchNF] = useState("");
  const [exactSearchProduto, setExactSearchProduto] = useState("");

  // Modal Drill-Down
  const [drillModalOpen, setDrillModalOpen] = useState(false);
  const [drillData, setDrillData] = useState<any[]>([]);
  const [drillTitle, setDrillTitle] = useState("");

  // Ref para Captura de Imagem do Dashboard
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [isExportingImage, setIsExportingImage] = useState(false);

  // Carregar Mapeamento de Lojas (Franquia vs Própria)
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

  const classifyTipoLoja = (r: any): "Franquia" | "Própria" | "Geral" => {
    const lojaVal = String(r.Loja || r.loja || "").trim();
    if (lojasMap[lojaVal]) {
      const tp = lojasMap[lojaVal].toLowerCase();
      if (tp.includes("propria") || tp.includes("própria")) return "Própria";
      if (tp.includes("franquia")) return "Franquia";
    }
    const rz = String(r.razao_social || r["Razão Social"] || "").toLowerCase();
    if (rz.includes("propria") || rz.includes("própria")) return "Própria";
    if (rz.includes("franquia")) return "Franquia";
    return "Geral";
  };

  // --- OPÇÕES DE FILTROS EXTRAÍDAS DOS DADOS ---
  const filterOptions = useMemo(() => {
    const cds = new Set<string>();
    const transps = new Set<string>();
    const tipos = new Set<string>();

    rawData.forEach((item) => {
      const cdVal = item["CD"];
      if (cdVal && String(cdVal).trim() !== "") {
        cds.add(String(cdVal).trim().replace(/^CD\s+/i, ""));
      }
      const transpVal = item["Transportadora"];
      if (transpVal && String(transpVal).trim() !== "") {
        transps.add(String(transpVal).trim());
      }
      const tipoVal = item["Tipo"];
      if (tipoVal && String(tipoVal).trim() !== "") {
        tipos.add(String(tipoVal).trim());
      }
    });

    return {
      cds: Array.from(cds).sort(),
      transps: Array.from(transps).sort(),
      tipos: Array.from(tipos).sort(),
    };
  }, [rawData]);

  // --- FILTRAGEM DINÂMICA DOS DADOS ---
  const filteredData = useMemo(() => {
    return rawData.filter((item) => {
      // 1. Data
      let dateField = item["Dt Abertura"];
      if (filters.dateRef === "Ref: Data de Finalização") dateField = item["Dt Finalização"];
      if (filters.dateRef === "Ref: Data de Pagamento") dateField = item["Dt Pagamento"];

      const dt = parseDataBR(dateField);
      if (filters.periodo !== "Todos" && dt) {
        const now = new Date();
        if (filters.periodo === "Últimos 7 dias") {
          const cut = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (dt < cut) return false;
        } else if (filters.periodo === "Últimos 30 dias") {
          const cut = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (dt < cut) return false;
        } else if (filters.periodo === "Mês Atual") {
          if (dt.getMonth() !== now.getMonth() || dt.getFullYear() !== now.getFullYear()) return false;
        }
      }

      if (filters.dataInicio && dt) {
        const dIni = parseDataBR(filters.dataInicio);
        if (dIni && dt < dIni) return false;
      }
      if (filters.dataFim && dt) {
        const dFim = parseDataBR(filters.dataFim);
        if (dFim) {
          dFim.setHours(23, 59, 59, 999);
          if (dt > dFim) return false;
        }
      }

      // 2. CD
      if (filters.cd !== "Todos") {
        const cdItem = String(item["CD"] || "").trim().replace(/^CD\s+/i, "");
        if (cdItem.toUpperCase() !== filters.cd.toUpperCase()) return false;
      }

      // 3. Transportadora
      if (filters.transp !== "Todas") {
        if (String(item["Transportadora"] || "").trim() !== filters.transp) return false;
      }

      // 4. Tipo Chamado
      if (filters.tipo !== "Todos") {
        if (String(item["Tipo"] || "").trim() !== filters.tipo) return false;
      }

      // 5. Status
      if (filters.status !== "Todos") {
        const statusChamado = String(item["Status Chamado"] || item["Situação "] || "").toUpperCase();
        if (filters.status === "Aprovado" && !statusChamado.includes("APROVADO")) return false;
        if (filters.status === "Recusado" && !statusChamado.includes("RECUSADO")) return false;
        if (filters.status === "Pendente" && (statusChamado.includes("APROVADO") || statusChamado.includes("RECUSADO"))) return false;
      }

      // 6. Busca Exata
      if (exactSearchChamado.trim() !== "") {
        const val = String(item["Chamado"] || "").trim();
        if (val !== exactSearchChamado.trim()) return false;
      }
      if (exactSearchLoja.trim() !== "") {
        const val = String(item["Loja"] || "").trim();
        if (val !== exactSearchLoja.trim()) return false;
      }
      if (exactSearchNF.trim() !== "") {
        const val = String(item["NF"] || "").trim();
        if (val !== exactSearchNF.trim()) return false;
      }
      if (exactSearchProduto.trim() !== "") {
        const refVal = String(item["referencia"] || item["Referencia"] || "").trim().toLowerCase();
        const motVal = String(item["Motivo"] || "").trim().toLowerCase();
        const term = exactSearchProduto.trim().toLowerCase();
        if (!refVal.includes(term) && !motVal.includes(term)) return false;
      }

      return true;
    });
  }, [
    rawData,
    filters,
    exactSearchChamado,
    exactSearchLoja,
    exactSearchNF,
    exactSearchProduto,
  ]);

  // --- CÁLCULO DE KPIS INTELIGENTES E METRICAS DE RECALL ---
  const metrics = useMemo(() => {
    let totalBrutoVal = 0;
    let totalAprovadoVal = 0;
    let totalPendenteVal = 0;
    let totalRecusadoVal = 0;

    let qtdAprovados = 0;
    let qtdRecusados = 0;
    let qtdPendentes = 0;

    let totalDiasUteisSla = 0;
    let countComDataFin = 0;
    let foraSlaCount = 0;

    const referenciasSet = new Set<string>();
    const lojasSet = new Set<string>();
    const motivosMap: Record<string, { qtd: number; valor: number }> = {};
    const cdsMap: Record<string, { total: number; aprovado: number; pendente: number; qtd: number }> = {};
    const lojasImpactoMap: Record<string, { loja: string; qtd: number; valor: number; tipo: string }> = {};
    const transpMap: Record<string, { qtd: number; valor: number }> = {};
    const mensaisMap: Record<string, { mes: string; total: number; aprovado: number; pendente: number; qtd: number }> = {};
    const agingMap = { "0-15d": 0, "16-30d": 0, "31-45d": 0, "46-60d": 0, ">60d": 0 };

    let franquiaVal = 0;
    let propriaVal = 0;
    let franquiaQtd = 0;
    let propriaQtd = 0;

    filteredData.forEach((item) => {
      const val = parseValorNumeric(item[" Valor "]);
      totalBrutoVal += val;

      const stChamado = String(item["Status Chamado"] || item["Situação "] || "").toUpperCase();
      const dtFin = String(item["Dt Finalização"] || "").trim();
      const isFin = dtFin !== "";

      if (stChamado.includes("APROVADO")) {
        qtdAprovados++;
        totalAprovadoVal += val;
      } else if (stChamado.includes("RECUSADO")) {
        qtdRecusados++;
        totalRecusadoVal += val;
      } else {
        qtdPendentes++;
        totalPendenteVal += val;
      }

      // Referência / Produto
      const ref = String(item["referencia"] || item["Referencia"] || "").trim();
      if (ref) referenciasSet.add(ref);

      // Loja
      const lojaStr = String(item["Loja"] || "").trim();
      if (lojaStr) {
        lojasSet.add(lojaStr);
        const tipoLoja = classifyTipoLoja(item);
        if (tipoLoja === "Franquia") {
          franquiaVal += val;
          franquiaQtd++;
        } else if (tipoLoja === "Própria") {
          propriaVal += val;
          propriaQtd++;
        }

        if (!lojasImpactoMap[lojaStr]) {
          lojasImpactoMap[lojaStr] = { loja: lojaStr, qtd: 0, valor: 0, tipo: tipoLoja };
        }
        lojasImpactoMap[lojaStr].qtd++;
        lojasImpactoMap[lojaStr].valor += val;
      }

      // Motivo
      const mot = String(item["Motivo"] || "Recall Não Especificado").trim();
      if (!motivosMap[mot]) motivosMap[mot] = { qtd: 0, valor: 0 };
      motivosMap[mot].qtd++;
      motivosMap[mot].valor += val;

      // CD
      let cd = String(item["CD"] || "Não Identificado").trim().replace(/^CD\s+/i, "");
      if (!cd) cd = "Outros";
      if (!cdsMap[cd]) cdsMap[cd] = { total: 0, aprovado: 0, pendente: 0, qtd: 0 };
      cdsMap[cd].total += val;
      cdsMap[cd].qtd++;
      if (stChamado.includes("APROVADO")) cdsMap[cd].aprovado += val;
      else if (!stChamado.includes("RECUSADO")) cdsMap[cd].pendente += val;

      // Transportadora
      const transp = String(item["Transportadora"] || "Própria / Outros").trim();
      if (!transpMap[transp]) transpMap[transp] = { qtd: 0, valor: 0 };
      transpMap[transp].qtd++;
      transpMap[transp].valor += val;

      // SLA & Aging
      const dtAb = parseDataBR(item["Dt Abertura"]);
      const dtFinParsed = parseDataBR(item["Dt Finalização"]);
      const dias = getBusinessDays(dtAb, dtFinParsed || new Date());

      if (dias > 60) foraSlaCount++;
      if (isFin) {
        totalDiasUteisSla += dias;
        countComDataFin++;
      } else {
        // Aging para chamados em aberto
        if (dias <= 15) agingMap["0-15d"]++;
        else if (dias <= 30) agingMap["16-30d"]++;
        else if (dias <= 45) agingMap["31-45d"]++;
        else if (dias <= 60) agingMap["46-60d"]++;
        else agingMap[">60d"]++;
      }

      // Evolução Mensal
      if (dtAb) {
        const mesKey = `${dtAb.getFullYear()}-${String(dtAb.getMonth() + 1).padStart(2, "0")}`;
        const mesNome = dtAb.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
        if (!mensaisMap[mesKey]) {
          mensaisMap[mesKey] = { mes: mesNome, total: 0, aprovado: 0, pendente: 0, qtd: 0 };
        }
        mensaisMap[mesKey].total += val;
        mensaisMap[mesKey].qtd++;
        if (stChamado.includes("APROVADO")) mensaisMap[mesKey].aprovado += val;
        else if (!stChamado.includes("RECUSADO")) mensaisMap[mesKey].pendente += val;
      }
    });

    const totalChamados = filteredData.length;
    const taxaResolutividade = totalChamados > 0 ? ((qtdAprovados + qtdRecusados) / totalChamados) * 100 : 0;
    const taxaAprovacao = totalChamados > 0 ? (qtdAprovados / totalChamados) * 100 : 0;
    const mediaDiasSla = countComDataFin > 0 ? Math.round(totalDiasUteisSla / countComDataFin) : 0;

    // Top Motivos
    const topMotivos = Object.entries(motivosMap)
      .map(([nome, d]) => ({ nome, qtd: d.qtd, valor: d.valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 7);

    // Top Lojas
    const topLojas = Object.values(lojasImpactoMap)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 7);

    // CD Array
    const cdsList = Object.entries(cdsMap).map(([cd, d]) => ({
      cd,
      total: d.total,
      aprovado: d.aprovado,
      pendente: d.pendente,
      qtd: d.qtd,
    }));

    // Mensal Array
    const mensaisList = Object.entries(mensaisMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, d]) => d);

    // Top Transportadoras
    const topTransp = Object.entries(transpMap)
      .map(([nome, d]) => ({ nome, qtd: d.qtd, valor: d.valor }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 6);

    return {
      totalChamados,
      totalBrutoVal,
      totalAprovadoVal,
      totalPendenteVal,
      totalRecusadoVal,
      qtdAprovados,
      qtdRecusados,
      qtdPendentes,
      taxaResolutividade,
      taxaAprovacao,
      mediaDiasSla,
      foraSlaCount,
      qtdReferencias: referenciasSet.size,
      qtdLojasAfetadas: lojasSet.size,
      topMotivos,
      topLojas,
      cdsList,
      mensaisList,
      topTransp,
      franquiaVal,
      propriaVal,
      franquiaQtd,
      propriaQtd,
      agingData: [
        { name: "0-15 dias", qtd: agingMap["0-15d"] },
        { name: "16-30 dias", qtd: agingMap["16-30d"] },
        { name: "31-45 dias", qtd: agingMap["31-45d"] },
        { name: "46-60 dias", qtd: agingMap["46-60d"] },
        { name: "> 60 dias (Crítico)", qtd: agingMap[">60d"] },
      ],
    };
  }, [filteredData, lojasMap]);

  // --- IA & INSIGHTS AUTOMÁTICOS DE RECALL ---
  const aiInsights = useMemo(() => {
    const insights: { title: string; desc: string; type: "alert" | "warning" | "success" | "info" }[] = [];

    if (!filteredData.length) {
      return [{ title: "Sem Dados", desc: "Nenhum chamado de Recall encontrado para os filtros selecionados.", type: "info" as const }];
    }

    // 1. Insight de Produto com maior impacto
    if (metrics.topMotivos.length > 0) {
      const top1 = metrics.topMotivos[0];
      const pct = metrics.totalBrutoVal > 0 ? Math.round((top1.valor / metrics.totalBrutoVal) * 100) : 0;
      if (pct > 25) {
        insights.push({
          title: `Concentração Crítica por Motivo: ${top1.nome}`,
          desc: `O motivo "${top1.nome}" representa ${pct}% do valor total de Recall (${formatarMoedaBR(top1.valor)}). Recomendado acionar controle de qualidade e fornecedores deste lote.`,
          type: "warning",
        });
      }
    }

    // 2. Insight de CD com maior acúmulo
    if (metrics.cdsList.length > 0) {
      const topCd = [...metrics.cdsList].sort((a, b) => b.pendente - a.pendente)[0];
      if (topCd && topCd.pendente > 0) {
        insights.push({
          title: `Maior Backlog em Análise: CD ${topCd.cd}`,
          desc: `O CD ${topCd.cd} possui ${formatarMoedaBR(topCd.pendente)} em recalls pendentes de finalização/indenização. Priorizar validação fiscal e emissão de NFD.`,
          type: "alert",
        });
      }
    }

    // 3. Insight Franquias vs Próprias
    if (metrics.franquiaVal > 0 || metrics.propriaVal > 0) {
      const totalVal = metrics.franquiaVal + metrics.propriaVal;
      const franPct = totalVal > 0 ? Math.round((metrics.franquiaVal / totalVal) * 100) : 0;
      insights.push({
        title: `Distribuição Franquias vs Lojas Próprias`,
        desc: `As lojas franqueadas representam ${franPct}% (${formatarMoedaBR(metrics.franquiaVal)}) do valor afetado por Recall. Agilidade na troca garante a satisfação do franqueado.`,
        type: "info",
      });
    }

    // 4. Insight de SLA
    if (metrics.foraSlaCount > 0) {
      insights.push({
        title: `SLA Estourado (>60 dias)`,
        desc: `Existem ${metrics.foraSlaCount} chamados de Recall que excederam o SLA limite de 60 dias úteis. Ação imediata necessária para encerramento bancário/fiscal.`,
        type: "alert",
      });
    } else {
      insights.push({
        title: `SLA sob Controle`,
        desc: `Todos os chamados de Recall analisados estão operando dentro do limite de 60 dias úteis.`,
        type: "success",
      });
    }

    return insights;
  }, [metrics, filteredData]);

  // --- HANDLERS DE DRILL-DOWN ---
  const handleDrillDown = (title: string, dataSubset: any[]) => {
    setDrillTitle(title);
    setDrillData(dataSubset);
    setDrillModalOpen(true);
  };

  // --- EXPORTAÇÃO EM EXCEL (.XLSX) ---
  const handleExportExcel = () => {
    const rowsToExport = filteredData.map((r) => ({
      Chamado: r["Chamado"] || "-",
      Loja: r["Loja"] || "-",
      "Razão Social": r["razao_social"] || "-",
      Tipo: r["Tipo"] || "-",
      NF: r["NF"] || "-",
      "Dt Emissão": fmtBRDate(r["Dt Emissão"]),
      "Valor (R$)": parseValorNumeric(r[" Valor "]),
      CD: r["CD"] || "-",
      Situação: r["Situação "] || r["Status Chamado"] || "-",
      "Dt Abertura": fmtBRDate(r["Dt Abertura"]),
      "Dt Finalização": fmtBRDate(r["Dt Finalização"]),
      Motivo: r["Motivo"] || "-",
      Transportadora: r["Transportadora"] || "-",
      Conferente: r["Conferente"] || "-",
      Referência: r["referencia"] || r["Referencia"] || "-",
    }));

    exportToExcel(rowsToExport, {
      filename: `Relatorio_Recall_Executivo_${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: "Recall Analytics",
    });
  };

  // --- EXPORTAÇÃO EM PNG ---
  const handleExportPNG = async () => {
    if (!dashboardRef.current) return;
    setIsExportingImage(true);
    try {
      const dataUrl = await toPng(dashboardRef.current, {
        cacheBust: true,
        backgroundColor: "#F4F6F5",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `Dashboard_Recall_Executivo_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Erro ao exportar PNG:", err);
    } finally {
      setIsExportingImage(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F4F6F5] min-h-screen text-slate-800 font-sans">
      {/* CABAÇALHO CORPORATIVO EXECUTIVO (MODERNO / AMANAH STYLE) */}
      <header className="h-16 bg-white border-b border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center justify-between px-6 flex-shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-700 shadow-xs">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Relatório & Analytics de Recall
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Visão Executiva
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Indicadores de Qualidade, SLA de Recolhimento e Impacto Financeiro
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            title="Exportar dados para Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel (.xlsx)
          </button>

          <button
            onClick={handleExportPNG}
            disabled={isExportingImage}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            title="Exportar visão gráfica em imagem PNG"
          >
            {isExportingImage ? <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> : <Download className="w-4 h-4 text-slate-500" />}
            Exportar PNG
          </button>

          {onChanged && (
            <button
              onClick={onChanged}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              title="Atualizar dados do relatório"
            >
              <RefreshCcw className={`w-4 h-4 text-slate-500 ${isLoading ? "animate-spin" : ""}`} />
              Atualizar
            </button>
          )}
        </div>
      </header>

      {/* BARRA DE FILTROS GLOBAIS & BUSCA EXATA */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs flex-shrink-0 z-20 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          {/* Data Ref */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Ref. Data</span>
            <select
              value={filters.dateRef}
              onChange={(e) => setFilters({ ...filters, dateRef: e.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none cursor-pointer"
            >
              <option>Ref: Data de Abertura</option>
              <option>Ref: Data de Finalização</option>
              <option>Ref: Data de Pagamento</option>
            </select>
          </div>

          {/* Período */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Período</span>
            <select
              value={filters.periodo}
              onChange={(e) => setFilters({ ...filters, periodo: e.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none cursor-pointer"
            >
              <option value="Todos">Todos os Períodos</option>
              <option value="Últimos 7 dias">Últimos 7 dias</option>
              <option value="Últimos 30 dias">Últimos 30 dias</option>
              <option value="Mês Atual">Mês Atual</option>
            </select>
          </div>

          {/* CD */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">CD</span>
            <select
              value={filters.cd}
              onChange={(e) => setFilters({ ...filters, cd: e.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none cursor-pointer"
            >
              <option value="Todos">Todos os CDs</option>
              {filterOptions.cds.map((cd) => (
                <option key={cd} value={cd}>
                  CD {cd}
                </option>
              ))}
            </select>
          </div>

          {/* Transportadora */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Transportadora</span>
            <select
              value={filters.transp}
              onChange={(e) => setFilters({ ...filters, transp: e.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none cursor-pointer max-w-[170px]"
            >
              <option value="Todas">Todas</option>
              {filterOptions.transps.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status</span>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none cursor-pointer"
            >
              <option value="Todos">Todos os Status</option>
              <option value="Aprovado">Aprovado</option>
              <option value="Pendente">Pendente / Em Análise</option>
              <option value="Recusado">Recusado</option>
            </select>
          </div>
        </div>

        {/* BUSCA EXATA ESPECÍFICA (Conforme Regra do Projeto: Ícone Lupa + Filtro Exato) */}
        <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Nº Chamado exato..."
              value={exactSearchChamado}
              onChange={(e) => setExactSearchChamado(e.target.value)}
              className="w-32 rounded-xl border border-slate-200 bg-white pl-2.5 pr-7 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Cód. Loja..."
              value={exactSearchLoja}
              onChange={(e) => setExactSearchLoja(e.target.value)}
              className="w-28 rounded-xl border border-slate-200 bg-white pl-2.5 pr-7 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Ref. Produto / Lote..."
              value={exactSearchProduto}
              onChange={(e) => setExactSearchProduto(e.target.value)}
              className="w-36 rounded-xl border border-slate-200 bg-white pl-2.5 pr-7 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
          </div>

          {(exactSearchChamado || exactSearchLoja || exactSearchNF || exactSearchProduto || filters.cd !== "Todos" || filters.status !== "Todos") && (
            <button
              onClick={() => {
                setExactSearchChamado("");
                setExactSearchLoja("");
                setExactSearchNF("");
                setExactSearchProduto("");
                setFilters({
                  dateRef: "Ref: Data de Abertura",
                  periodo: "Todos",
                  dataInicio: "",
                  dataFim: "",
                  cd: "Todos",
                  transp: "Todas",
                  status: "Todos",
                  tipo: "Todos",
                });
              }}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              title="Limpar todos os filtros"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ABA DE NAVEGAÇÃO INTERNA */}
      <div className="bg-white border-b border-slate-200/80 px-6 flex items-center gap-1 flex-shrink-0 z-10">
        {[
          { id: "resumo", label: "Visão Executiva & KPIs", icon: LayoutGrid },
          { id: "origem", label: "Análise de Motivos & Origem", icon: Layers },
          { id: "sla", label: "SLA, Aging & Riscos", icon: Clock },
          { id: "tabela", label: "Listagem Detalhada de Recall", icon: ListChecks },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                isActive
                  ? "border-emerald-600 text-emerald-700 font-bold bg-emerald-50/40"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ÁREA DE CONTEÚDO PRINCIPAL COM SCROLL */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={dashboardRef}>
        {/* CARDS DE KPI EXECUTIVOS (ESTILO AMANAH - BANCO DE CARDS BRANCO COM BORDA DELICADA) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {/* Card 1: Total Chamados */}
          <div
            onClick={() => handleDrillDown("Todos os Recalls", filteredData)}
            className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:border-emerald-400 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Recalls</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight">{metrics.totalChamados}</div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-slate-500">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  {metrics.qtdLojasAfetadas} lojas
                </span>
                <span>afetadas</span>
              </div>
            </div>
          </div>

          {/* Card 2: Valor Total em Recall */}
          <div
            onClick={() => handleDrillDown("Impacto Financeiro Bruto em Recall", filteredData)}
            className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:border-emerald-400 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor Bruto</span>
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight">
                {formatarMoedaBR(metrics.totalBrutoVal)}
              </div>
              <div className="text-[11px] font-medium text-slate-400 mt-1">Montante total recolhido</div>
            </div>
          </div>

          {/* Card 3: Valor Aprovado / Ressarcido */}
          <div
            onClick={() => handleDrillDown("Recalls Aprovados", filteredData.filter((r) => String(r["Status Chamado"] || r["Situação "] || "").toUpperCase().includes("APROVADO")))}
            className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:border-emerald-400 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor Aprovado</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-700 tracking-tight">
                {formatarMoedaBR(metrics.totalAprovadoVal)}
              </div>
              <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500">
                <span className="font-semibold text-emerald-700">{metrics.qtdAprovados} chamados</span>
                <span>({metrics.taxaAprovacao.toFixed(0)}%)</span>
              </div>
            </div>
          </div>

          {/* Card 4: Valor Pendente de Análise */}
          <div
            onClick={() => handleDrillDown("Recalls Pendentes em Trânsito", filteredData.filter((r) => !String(r["Status Chamado"] || r["Situação "] || "").toUpperCase().includes("APROVADO") && !String(r["Status Chamado"] || r["Situação "] || "").toUpperCase().includes("RECUSADO")))}
            className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:border-amber-400 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pendente Análise</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-700 tracking-tight">
                {formatarMoedaBR(metrics.totalPendenteVal)}
              </div>
              <div className="text-[11px] font-medium text-slate-500 mt-1">
                {metrics.qtdPendentes} chamados em tratativa
              </div>
            </div>
          </div>

          {/* Card 5: Taxa de Resolutividade */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resolutividade</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight">
                {metrics.taxaResolutividade.toFixed(1)}%
              </div>
              <div className="text-[11px] font-medium text-slate-400 mt-1">Concluídos vs Abertos</div>
            </div>
          </div>

          {/* Card 6: SLA Médio (Dias Úteis) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">SLA Médio</span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${metrics.mediaDiasSla > 60 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight">
                {metrics.mediaDiasSla} <span className="text-sm font-normal text-slate-500">dias úteis</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px]">
                {metrics.foraSlaCount > 0 ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
                    {metrics.foraSlaCount} &gt; 60D
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    No Prazo
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CENTRAL DE INSIGHTS AUTOMÁTICOS DE IA (SMART RECOMMENDATIONS) */}
        <div className="bg-white rounded-2xl border border-emerald-200/80 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Insights Inteligentes de Abastecimento & Risk Management
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {aiInsights.map((insight, idx) => {
              const borderColors = {
                alert: "border-rose-200 bg-rose-50/40 text-rose-900",
                warning: "border-amber-200 bg-amber-50/40 text-amber-900",
                success: "border-emerald-200 bg-emerald-50/40 text-emerald-900",
                info: "border-sky-200 bg-sky-50/40 text-sky-900",
              };
              const dotColors = {
                alert: "bg-rose-500",
                warning: "bg-amber-500",
                success: "bg-emerald-500",
                info: "bg-sky-500",
              };
              return (
                <div key={idx} className={`p-3.5 rounded-xl border ${borderColors[insight.type]} flex flex-col justify-between`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`h-2 w-2 rounded-full ${dotColors[insight.type]}`}></span>
                    <h3 className="text-xs font-bold leading-snug">{insight.title}</h3>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600">{insight.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ABA 1: VISÃO EXECUTIVA & KPIS */}
        {activeTab === "resumo" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Gráfico 1: Evolução Mensal do Recall (Volume vs Valor Bruto) */}
              <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/70 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Evolução Mensal do Recall</h3>
                    <p className="text-xs text-slate-500">Volume de chamados e montante financeiro por mês</p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
                    Histórico
                  </span>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={metrics.mensaisList} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(val: any, name: string) => [
                          name.includes("Valor") ? formatarMoedaBR(Number(val)) : val,
                          name,
                        ]}
                        contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                      <Bar yAxisId="left" dataKey="total" name="Valor Total (R$)" fill={COLOR_EMERALD} radius={[6, 6, 0, 0]} barSize={28} />
                      <Line yAxisId="right" type="monotone" dataKey="qtd" name="Qtd Chamados" stroke={COLOR_AMBER} strokeWidth={2.5} dot={{ r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico 2: Distribuição por Status do Recall */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Status dos Chamados</h3>
                    <p className="text-xs text-slate-500">Proporção Aprovado vs Pendente vs Recusado</p>
                  </div>
                </div>
                <div className="h-64 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Aprovados", value: metrics.qtdAprovados, valor: metrics.totalAprovadoVal },
                          { name: "Pendentes", value: metrics.qtdPendentes, valor: metrics.totalPendenteVal },
                          { name: "Recusados", value: metrics.qtdRecusados, valor: metrics.totalRecusadoVal },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        <Cell fill={COLOR_EMERALD} />
                        <Cell fill={COLOR_AMBER} />
                        <Cell fill={COLOR_ROSE} />
                      </Pie>
                      <Tooltip
                        formatter={(val: any, name: string, item: any) => [
                          `${val} chamados (${formatarMoedaBR(item.payload.valor)})`,
                          name,
                        ]}
                        contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Gráfico 3: Impacto Financeiro por CD */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Impacto Financeiro por CD (Centro de Distribuição)</h3>
                  <p className="text-xs text-slate-500">Comparativo entre CDs ES, PB, TO e outros</p>
                </div>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.cdsList} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="cd" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(val: any, name: string) => [formatarMoedaBR(Number(val)), name]}
                      contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                    <Bar dataKey="total" name="Valor Total Bruto" fill={COLOR_SKY} radius={[6, 6, 0, 0]} barSize={22} />
                    <Bar dataKey="aprovado" name="Valor Aprovado" fill={COLOR_EMERALD} radius={[6, 6, 0, 0]} barSize={22} />
                    <Bar dataKey="pendente" name="Valor Pendente" fill={COLOR_AMBER} radius={[6, 6, 0, 0]} barSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: ANÁLISE DE MOTIVOS & ORIGEM */}
        {activeTab === "origem" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Motivos de Recall */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Principais Motivos de Recall</h3>
                    <p className="text-xs text-slate-500">Ranking por valor total acumulado</p>
                  </div>
                </div>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={metrics.topMotivos} margin={{ top: 0, right: 20, left: 40, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="nome" type="category" tick={{ fontSize: 11, fill: "#334155" }} width={120} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(val: any, name: string) => [formatarMoedaBR(Number(val)), "Valor Total"]}
                        contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
                      />
                      <Bar dataKey="valor" fill={COLOR_EMERALD} radius={[0, 6, 6, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Lojas Afetadas por Recall */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Top Lojas com Ocorrências de Recall</h3>
                    <p className="text-xs text-slate-500">Lojas com maior volume financeiro recolhido</p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
                  {metrics.topLojas.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between hover:bg-slate-50/60 px-2 rounded-xl transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-slate-800">Loja {item.loja}</div>
                          <div className="text-[11px] text-slate-400 font-medium">{item.qtd} chamados de recall</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-900">{formatarMoedaBR(item.valor)}</div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${item.tipo === "Franquia" ? "bg-amber-50 text-amber-700 border-amber-200/60" : "bg-emerald-50 text-emerald-700 border-emerald-200/60"}`}>
                          {item.tipo}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Transportadoras com maior volume */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Ocorrências por Transportadora</h3>
                  <p className="text-xs text-slate-500">Movimentação logística dos lotes recolhidos</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {metrics.topTransp.map((t, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-200/70 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-2xs">
                        <Truck className="w-4 h-4 text-emerald-700" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">{t.nome}</div>
                        <div className="text-[11px] text-slate-500">{t.qtd} chamados</div>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-slate-900">{formatarMoedaBR(t.valor)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: SLA, AGING & RISCOS */}
        {activeTab === "sla" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Aging dos Chamados em Aberto */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Aging dos Recalls em Aberto</h3>
                    <p className="text-xs text-slate-500">Tempo de permanência em dias úteis</p>
                  </div>
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">
                    Prazos
                  </span>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.agingData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(val: any) => [`${val} chamados`, "Quantidade"]}
                        contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
                      />
                      <Bar dataKey="qtd" radius={[6, 6, 0, 0]} barSize={32}>
                        {metrics.agingData.map((entry, index) => {
                          const colors = [COLOR_EMERALD, COLOR_EMERALD_LIGHT, COLOR_AMBER, COLOR_ROSE, COLOR_ROSE];
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Tabela de Matriz de Risco (Chamados Críticos) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Chamados em Risco de SLA (&gt;45 dias)</h3>
                    <p className="text-xs text-slate-500">Casos que requerem intervenção imediata</p>
                  </div>
                  <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200/60">
                    Atenção Prioritária
                  </span>
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="px-3 py-2">Chamado</th>
                        <th className="px-3 py-2">Loja</th>
                        <th className="px-3 py-2">CD</th>
                        <th className="px-3 py-2">Valor</th>
                        <th className="px-3 py-2">Dias Úteis</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredData
                        .filter((r) => {
                          const dtAb = parseDataBR(r["Dt Abertura"]);
                          const dtFin = parseDataBR(r["Dt Finalização"]);
                          if (dtFin) return false;
                          const d = getBusinessDays(dtAb, new Date());
                          return d >= 45;
                        })
                        .slice(0, 7)
                        .map((r, idx) => {
                          const dtAb = parseDataBR(r["Dt Abertura"]);
                          const dias = getBusinessDays(dtAb, new Date());
                          const val = parseValorNumeric(r[" Valor "]);
                          return (
                            <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-3 py-2.5 font-bold text-slate-800">#{r["Chamado"]}</td>
                              <td className="px-3 py-2.5 text-slate-600">Loja {r["Loja"]}</td>
                              <td className="px-3 py-2.5 font-semibold text-slate-700">CD {r["CD"]}</td>
                              <td className="px-3 py-2.5 font-bold text-slate-900">{formatarMoedaBR(val)}</td>
                              <td className="px-3 py-2.5">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${dias > 60 ? "bg-rose-50 text-rose-700 border-rose-200/60" : "bg-amber-50 text-amber-700 border-amber-200/60"}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${dias > 60 ? "bg-rose-500" : "bg-amber-500"}`}></span>
                                  {dias} dias úteis
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      {filteredData.filter((r) => !r["Dt Finalização"] && getBusinessDays(parseDataBR(r["Dt Abertura"]), new Date()) >= 45).length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-slate-400 font-medium">
                            Nenhum chamado de Recall com tempo superior a 45 dias úteis! 🎉
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 4: TABELA ANALÍTICA DE RECALL */}
        {activeTab === "tabela" && (
          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Listagem Completa de Chamados de Recall</h3>
                <p className="text-xs text-slate-500">Exibindo {filteredData.length} registros filtrados</p>
              </div>
              <button
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-semibold hover:bg-emerald-100 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Exportar Planilha
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-3">Chamado</th>
                    <th className="px-4 py-3">Loja</th>
                    <th className="px-4 py-3">CD</th>
                    <th className="px-4 py-3">Referência / Produto</th>
                    <th className="px-4 py-3">Motivo</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Dt Abertura</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.slice(0, 100).map((r, idx) => {
                    const stChamado = String(r["Status Chamado"] || r["Situação "] || "").toUpperCase();
                    const isAprovado = stChamado.includes("APROVADO");
                    const isRecusado = stChamado.includes("RECUSADO");
                    const isPendente = !isAprovado && !isRecusado;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-800">#{r["Chamado"]}</td>
                        <td className="px-4 py-3 font-medium text-slate-700">Loja {r["Loja"]}</td>
                        <td className="px-4 py-3 font-semibold text-slate-600">CD {r["CD"]}</td>
                        <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate" title={r["referencia"] || r["Referencia"]}>
                          {r["referencia"] || r["Referencia"] || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate" title={r["Motivo"]}>
                          {r["Motivo"] || "Recall"}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">{formatarMoedaBR(parseValorNumeric(r[" Valor "]))}</td>
                        <td className="px-4 py-3 text-slate-500">{fmtBRDate(r["Dt Abertura"])}</td>
                        <td className="px-4 py-3">
                          {isAprovado && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Aprovado
                            </span>
                          )}
                          {isRecusado && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span> Recusado
                            </span>
                          )}
                          {isPendente && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span> Em Análise
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredData.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400 font-medium">
                        Nenhum registro de Recall localizado com os filtros informados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredData.length > 100 && (
              <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500 font-medium">
                Exibindo os primeiros 100 de {filteredData.length} registros. Utilize a exportação em Excel para extrair o conjunto completo.
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL DRILL-DOWN */}
      <DrillDownModal
        isOpen={drillModalOpen}
        onClose={() => setDrillModalOpen(false)}
        data={drillData}
        title={drillTitle}
      />
    </div>
  );
}
