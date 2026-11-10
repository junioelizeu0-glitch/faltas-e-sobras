import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Search, X, Pencil, Trash2, DownloadCloud, UploadCloud, Loader2, Plus, FileText, RotateCcw, Workflow } from "lucide-react";
import { parseDataBR, formatarMoedaBR } from "@/lib/data-processing";
import { deleteChamado, updateMultipleChamadosTarefas, listTarefas } from "@/lib/chamados.functions";
import { pullFromAppsScript, pushToAppsScript } from "@/lib/sync.functions";
import ChamadoForm from "./ChamadoForm";
import { getParceiroByLoja } from "@/lib/lojas.functions";
import ErrorBoundary from "./ErrorBoundary";
import Pagination from "./Pagination";

const PAGE_SIZE = 30;

const STATUS_CHAMADO_OPCOES = ["Pendente Monitoramento", "Aprovado", "Recusado"];

const FERIADOS = new Set(["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "12-25"]);
function isDiaUtil(d: Date) {
  const dow = d.getDay(); if (dow === 0 || dow === 6) return false;
  return !FERIADOS.has(`${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
}
function diasUteisEntre(i: Date, f: Date) {
  if (f < i) return 0;
  let c = 0; const cur = new Date(i.getFullYear(), i.getMonth(), i.getDate()); const end = new Date(f.getFullYear(), f.getMonth(), f.getDate());
  while (cur <= end) { if (isDiaUtil(cur)) c++; cur.setDate(cur.getDate() + 1); }
  return Math.max(0, c - 1);
}
function diasUteisAteHoje(a: string) { const d = parseDataBR(a); return d ? diasUteisEntre(d, new Date()) : null; }
function slaCalc(a: string, f: string) { const i = parseDataBR(a); if (!i) return ""; const fim = parseDataBR(f); if (!fim) return "Em Aberto"; return diasUteisEntre(i, fim) <= 60 ? "Dentro do SLA" : "Fora do SLA"; }
function fmtBR(iso: string) { if (!iso) return "—"; const d = parseDataBR(iso); return d ? d.toLocaleDateString("pt-BR") : iso; }

function slaBadge(a: string, f: string) {
  if (f) {
    const s = slaCalc(a, f); const i = parseDataBR(a); const fim = parseDataBR(f);
    const dias = i && fim ? diasUteisEntre(i, fim) : null;
    const ok = s === "Dentro do SLA";
    return <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{s}{dias != null ? ` · ${dias}d` : ""}</span>;
  }
  const d = diasUteisAteHoje(a); if (d == null) return <span className="text-slate-400">—</span>;
  const cor = d > 60 ? "bg-red-50 text-red-700" : d > 45 ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700";
  return <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${cor}`}>Em aberto · {d}d</span>;
}
function statusBadge(s: string) {
  const ls = (s || "").toLowerCase();
  const cor = ls.includes("aprov") ? "bg-emerald-50 text-emerald-700" : ls.includes("recus") ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700";
  return <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${cor}`}>{s || "—"}</span>;
}

function tarefaAtual(r: any) {
  return String(r.situacao || r["Situação "] || "").trim() || "—";
}

function isMatchExato(valor: any, filtro: string): boolean {
  const f = filtro.trim().toLowerCase();
  if (!f) return true;
  const strVal = String(valor ?? "").trim().toLowerCase();
  if (strVal === f) return true;
  const numVal = Number(strVal);
  const numF = Number(f);
  if (!isNaN(numVal) && !isNaN(numF) && strVal !== "" && f !== "") {
    return numVal === numF;
  }
  return false;
}

type Props = { rawData: any[] | undefined; onChanged?: () => void; tabela?: "faltas" | "recall" };

export default function ConsultaChamados({ rawData, onChanged, tabela = "faltas" }: Props) {
  const [busca, setBusca] = useState("");
  const [filtroLoja, setFiltroLoja] = useState("");
  const [filtroChamado, setFiltroChamado] = useState("");
  const [filtroGLPI, setFiltroGLPI] = useState("");
  const [filtroNF, setFiltroNF] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [filtroTarefa, setFiltroTarefa] = useState("Todas");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [syncing, setSyncing] = useState<"pull" | "push" | null>(null);
  const [modalMudarTarefa, setModalMudarTarefa] = useState(false);
  const [novaTarefaSelecionada, setNovaTarefaSelecionada] = useState("");
  const [salvandoLote, setSalvandoLote] = useState(false);
  const [tarefasCatalogo, setTarefasCatalogo] = useState<Array<{ id: string; nome: string; dias_uteis: number }>>([]);
  const delFn = useServerFn(deleteChamado);
  const pullFn = useServerFn(pullFromAppsScript);
  const pushFn = useServerFn(pushToAppsScript);
  const updateMultipleTarefasFn = useServerFn(updateMultipleChamadosTarefas);
  const listTarefasFn = useServerFn(listTarefas);

  useEffect(() => {
    (async () => {
      try {
        const tipo = tabela === "recall" ? "RECALL" : "FALTAS";
        const res: any = await listTarefasFn({ data: { tipo } });
        if (Array.isArray(res)) setTarefasCatalogo(res);
      } catch (e) {
        console.warn("Erro ao listar tarefas para lote:", e);
      }
    })();
  }, [tabela, listTarefasFn]);

  const doPull = async () => {
    if (!confirm("Puxar dados da API? Chamados existentes serão atualizados e novos serão adicionados.")) return;
    setSyncing("pull");
    try {
      const r: any = await pullFn({ data: undefined as any });
      toast.success(`Planilha atualizada: ${r.inseridos} novos, ${r.atualizados} alterados`);
      onChanged?.();
    } catch (e: any) { toast.error(e?.message || "Erro ao puxar da planilha"); }
    finally { setSyncing(null); }
  };
  const doPush = async () => {
    if (!confirm("Enviar TODOS os chamados do banco para a planilha? A aba será substituída.")) return;
    setSyncing("push");
    try {
      const r: any = await pushFn({ data: undefined as any });
      toast.success(`Dados enviados: ${r.enviados} chamados`);
    } catch (e: any) { toast.error(e?.message || "Erro ao enviar para planilha"); }
    finally { setSyncing(null); }
  };

  const tarefas = useMemo(() => {
    const set = new Set<string>();
    (rawData || []).forEach((r: any) => {
      const t = tarefaAtual(r);
      if (t && t !== "—") set.add(t);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rawData]);

  const todasTarefasOpcoes = useMemo(() => {
    const set = new Set<string>();
    tarefasCatalogo.forEach((t) => { if (t.nome) set.add(t.nome); });
    tarefas.forEach((t) => { if (t && t !== "—") set.add(t); });
    if (tabela === "recall") {
      ["Aguardando monitoramento", "Chamado Aprovado", "Solicitar NF Espelho", "Aguardando NF Espelho", "Validação NF Espelho", "Importação NF", "Pendente Provisionamento Financeiro", "Finalizar Chamado", "Finalizado", "Chamado Recusado"].forEach(t => set.add(t));
    } else {
      ["Aguardando monitoramento", "Chamado Aprovado", "Solicitar NF Espelho", "Aguardando NF Espelho", "Validação NF Espelho", "Emitir NFD", "Pendente Provisionamento Financeiro", "Finalizar Chamado", "Finalizado", "Chamado Recusado"].forEach(t => set.add(t));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [tarefasCatalogo, tarefas, tabela]);

  const chamadosSelecionadosList = useMemo(() => {
    return (rawData || []).filter((r: any) => selected.has(r.id));
  }, [rawData, selected]);

  const executarMudancaTarefaLote = async () => {
    if (!novaTarefaSelecionada) {
      toast.warning("Selecione uma tarefa para continuar.");
      return;
    }
    const ids = Array.from(selected);
    if (ids.length === 0) {
      toast.warning("Nenhum chamado selecionado.");
      return;
    }
    setSalvandoLote(true);
    try {
      const res: any = await updateMultipleTarefasFn({
        data: {
          ids,
          novaTarefa: novaTarefaSelecionada,
          tabela,
        },
      });
      toast.success(`Tarefa de ${res?.count ?? ids.length} chamado(s) alterada para "${novaTarefaSelecionada}" com sucesso!`);
      setModalMudarTarefa(false);
      setNovaTarefaSelecionada("");
      setSelected(new Set());
      onChanged?.();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar tarefas dos chamados.");
    } finally {
      setSalvandoLote(false);
    }
  };



  const linhas = useMemo(() => {
    const fGlobal = busca.trim().toLowerCase();

    return (rawData || [])
      .filter((r: any) => {
        if (filtroStatus !== "Todos" && String(r["Status Chamado"] || "") !== filtroStatus) return false;

        const t = tarefaAtual(r);
        if (filtroTarefa !== "Todas" && t !== filtroTarefa) return false;

        if (filtroLoja.trim()) {
          const l = r.Loja ?? r.loja;
          if (!isMatchExato(l, filtroLoja)) return false;
        }

        if (filtroChamado.trim()) {
          const cham = r.Chamado ?? r["Chamados"] ?? r.chamadoId;
          if (!isMatchExato(cham, filtroChamado)) return false;
        }

        if (tabela === "recall" && filtroGLPI.trim()) {
          const glpi = r.glpi ?? r.GLPI;
          if (!isMatchExato(glpi, filtroGLPI)) return false;
        }

        if (filtroNF.trim()) {
          const nf = r.NF ?? r["Nº Nfe"] ?? r.nfe;
          if (!isMatchExato(nf, filtroNF)) return false;
        }

        if (!fGlobal) return true;
        return [r.Chamado, r.glpi, r.GLPI, r.Loja, r.parceiro, getParceiroByLoja(r.Loja), r.NF, r.CD, r.Transportadora, r.Conferente, t]
          .map((v) => String(v ?? "").toLowerCase()).some((s) => s.includes(fGlobal));
      })
      .sort((a: any, b: any) => (parseDataBR(b["Dt Abertura"])?.getTime() ?? 0) - (parseDataBR(a["Dt Abertura"])?.getTime() ?? 0));
  }, [rawData, busca, filtroStatus, filtroTarefa, filtroLoja, filtroChamado, filtroGLPI, filtroNF, tabela]);



  useEffect(() => { setPage(0); }, [busca, filtroStatus, filtroTarefa, filtroLoja, filtroChamado, filtroGLPI, filtroNF]);
  const totalPages = Math.max(1, Math.ceil(linhas.length / PAGE_SIZE));
  const paginadas = useMemo(() => linhas.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [linhas, page]);

  const allSelected = paginadas.length > 0 && paginadas.every((r: any) => selected.has(r.id));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allSelected) paginadas.forEach((r: any) => next.delete(r.id));
    else paginadas.forEach((r: any) => r.id && next.add(r.id));
    setSelected(next);
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const temFiltroAtivo = Boolean(busca || filtroStatus !== "Todos" || filtroTarefa !== "Todas" || filtroLoja || filtroChamado || filtroGLPI || filtroNF);
  const limparFiltros = () => {
    setBusca("");
    setFiltroStatus("Todos");
    setFiltroTarefa("Todas");
    setFiltroLoja("");
    setFiltroChamado("");
    setFiltroGLPI("");
    setFiltroNF("");
  };

  const excluirIds = async (ids: string[]) => {
    if (!ids.length) return;
    if (!confirm(`Excluir ${ids.length} chamado(s)? Esta ação não pode ser desfeita.`)) return;
    try {
      const res: any = await delFn({ data: { ids, tabela } });
      toast.success(`${res?.count ?? ids.length} chamado(s) excluído(s)`);
      setSelected(new Set());
      onChanged?.();
    } catch (e: any) { toast.error(e?.message || "Erro ao excluir chamado"); }
  };

  const abrirEditarSelecionado = () => {
    const ids = Array.from(selected);
    if (ids.length !== 1) { toast.info("Selecione exatamente 1 chamado para alterar."); return; }
    setEditingId(ids[0]);
  };

  return (
    <div className="flex-1 min-h-screen bg-[#F4F6F5] p-4 md:p-6 space-y-6 text-slate-800 font-sans">
      <div className="w-full bg-white rounded-2xl border border-slate-200/70 shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-6 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Consulta de Chamados</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">
                {selected.size > 0 ? `${selected.size} selecionado(s) de ${linhas.length}` : `Exibindo ${linhas.length} chamado(s)`}
              </span>
              {selected.size > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setNovaTarefaSelecionada("");
                    setModalMudarTarefa(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer transition-all"
                  title="Alterar a tarefa de todos os chamados selecionados em lote"
                >
                  <Workflow className="w-3.5 h-3.5" />
                  <span>Mudar Tarefa ({selected.size})</span>
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCreating(true)}
              title="Novo chamado"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl cursor-pointer shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Chamado</span>
            </button>
            <button
              onClick={doPull}
              disabled={syncing !== null}
              title="Puxar dados atualizados da API"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl disabled:opacity-40 transition-colors cursor-pointer bg-white"
            >
              {syncing === "pull" ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4 text-emerald-700" />}
              <span>Puxar da API</span>
            </button>
            <button
              onClick={doPush}
              disabled={syncing !== null}
              title="Enviar dados do banco para a API"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl disabled:opacity-40 transition-colors cursor-pointer bg-white"
            >
              {syncing === "push" ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4 text-emerald-700" />}
              <span>Enviar p/ API</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setNovaTarefaSelecionada("");
                setModalMudarTarefa(true);
              }}
              disabled={selected.size === 0}
              title={selected.size > 0 ? `Alterar tarefa de ${selected.size} chamado(s)` : "Selecione chamados na tabela para alterar a tarefa em lote"}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs ${selected.size > 0
                  ? "bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-800"
                  : "text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed opacity-50"
                }`}
            >
              <Workflow className="w-4 h-4" />
              <span>Mudar Tarefa {selected.size > 0 ? `(${selected.size})` : ""}</span>
            </button>
            <button
              onClick={abrirEditarSelecionado}
              disabled={selected.size !== 1}
              title="Alterar individual"
              className="inline-flex items-center p-2 text-emerald-700 hover:bg-emerald-50 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-slate-200 bg-white"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => excluirIds(Array.from(selected))}
              disabled={selected.size === 0}
              title="Excluir"
              className="inline-flex items-center p-2 text-rose-600 hover:bg-rose-50 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-slate-200 bg-white"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Filtros Avançados com Lupa em Cada Campo e Busca Exata */}
        <div className="flex flex-wrap gap-3 bg-slate-50/70 border border-slate-200/60 rounded-xl p-3.5 items-end text-xs">
          <div className="flex flex-col min-w-[140px] flex-1 max-w-[180px]">
            <label className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider flex items-center justify-between">
              <span>Nº Chamado</span>
              <span className="text-[9px] text-emerald-600 font-normal uppercase">Exato</span>
            </label>
            <div className="relative flex items-center">
              <input
                value={filtroChamado}
                onChange={(e) => setFiltroChamado(e.target.value)}
                placeholder="Ex: 12345"
                className="w-full pl-3 pr-8 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
              />
              <button
                type="button"
                title="Buscar Chamado Exato"
                className="absolute right-2 text-slate-400 hover:text-emerald-700 transition-colors p-1 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {tabela === "recall" && (
            <div className="flex flex-col min-w-[140px] flex-1 max-w-[180px]">
              <label className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider flex items-center justify-between">
                <span>Nº GLPI</span>
                <span className="text-[9px] text-emerald-600 font-normal uppercase">Exato</span>
              </label>
              <div className="relative flex items-center">
                <input
                  value={filtroGLPI}
                  onChange={(e) => setFiltroGLPI(e.target.value)}
                  placeholder="Ex: 987654"
                  className="w-full pl-3 pr-8 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                />
                <button
                  type="button"
                  title="Buscar GLPI Exato"
                  className="absolute right-2 text-slate-400 hover:text-emerald-700 transition-colors p-1 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col min-w-[140px] flex-1 max-w-[180px]">
            <label className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider flex items-center justify-between">
              <span>Loja</span>
              <span className="text-[9px] text-emerald-600 font-normal uppercase">Exato</span>
            </label>
            <div className="relative flex items-center">
              <input
                value={filtroLoja}
                onChange={(e) => setFiltroLoja(e.target.value)}
                placeholder="Ex: 4"
                className="w-full pl-3 pr-8 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
              />
              <button
                type="button"
                title="Buscar Loja Exata"
                className="absolute right-2 text-slate-400 hover:text-emerald-700 transition-colors p-1 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-col min-w-[140px] flex-1 max-w-[180px]">
            <label className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider flex items-center justify-between">
              <span>Nº NF</span>
              <span className="text-[9px] text-emerald-600 font-normal uppercase">Exato</span>
            </label>
            <div className="relative flex items-center">
              <input
                value={filtroNF}
                onChange={(e) => setFiltroNF(e.target.value)}
                placeholder="Ex: 98765"
                className="w-full pl-3 pr-8 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
              />
              <button
                type="button"
                title="Buscar NF Exata"
                className="absolute right-2 text-slate-400 hover:text-emerald-700 transition-colors p-1 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-col min-w-[160px] flex-1 max-w-[200px]">
            <label className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Status Chamado</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white cursor-pointer font-semibold outline-none focus:border-emerald-500"
            >
              <option value="Todos">Todos os Status</option>
              {STATUS_CHAMADO_OPCOES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex flex-col min-w-[180px] flex-1 max-w-[240px]">
            <label className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Tarefa Atual</label>
            <select
              value={filtroTarefa}
              onChange={(e) => setFiltroTarefa(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white cursor-pointer font-semibold outline-none focus:border-emerald-500"
            >
              <option value="Todas">Todas as Tarefas</option>
              {tarefas.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="relative min-w-[200px] flex-1">
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Busca Geral</label>
            <div className="relative flex items-center">
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Busca por CD, Conferente, Transportadora..."
                className="w-full pl-3 pr-8 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
              />
              <button
                type="button"
                title="Buscar Geral"
                className="absolute right-2 text-slate-400 hover:text-emerald-700 transition-colors p-1 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {temFiltroAtivo && (
            <button
              onClick={limparFiltros}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200/60 rounded-xl hover:bg-rose-100 transition-colors cursor-pointer"
              title="Limpar todos os filtros"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>
          )}
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-auto max-h-[600px]">
            <table className="min-w-full text-xs text-left border-collapse">
              <thead className="sticky top-0 z-20 bg-slate-100 text-[11px] uppercase tracking-wider text-slate-700 shadow-2xs">
                <tr className="bg-slate-100">
                  <th className="sticky top-0 z-20 bg-slate-100 w-8 px-3 py-3"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="cursor-pointer" /></th>
                  <th className="sticky top-0 z-20 bg-slate-100 px-4 py-3 font-bold">Chamado</th>
                  {tabela === "recall" && <th className="sticky top-0 z-20 bg-slate-100 px-3 py-3 font-bold text-slate-700">GLPI</th>}
                  <th className="sticky top-0 z-20 bg-slate-100 px-4 py-3 font-bold">Loja</th>
                  {tabela === "recall" && <th className="text-left px-3 py-2 font-semibold">Ref</th>}
                  <th className="text-left px-3 py-2 font-semibold">NF</th>
                  <th className="text-left px-3 py-2 font-semibold">CD</th>
                  <th className="text-left px-3 py-2 font-semibold">Abertura</th>
                  <th className="text-left px-3 py-2 font-semibold">Tarefa Atual</th>
                  <th className="text-left px-3 py-2 font-semibold">Status</th>
                  <th className="text-left px-3 py-2 font-semibold">SLA</th>
                  <th className="text-right px-3 py-2 font-semibold">Valor</th>
                  <th className="text-right px-3 py-2 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginadas.map((r: any) => {
                  const idStr = r.id != null ? String(r.id) : "";
                  const nfVal = r.NF || r["Nº Nfe"] || r.nfe || "—";
                  const valFmt = formatarMoedaBR(r[" Valor "] || r.valor || r.Valor, { showZero: true });

                  return (
                    <tr
                      key={idStr || r.Chamado}
                      onClick={() => idStr && setEditingId(idStr)}
                      onDoubleClick={() => idStr && setEditingId(idStr)}
                      className={`border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer select-none ${idStr && selected.has(idStr) ? "bg-emerald-50/50" : ""}`}
                    >
                      <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={idStr ? selected.has(idStr) : false} onChange={() => idStr && toggleOne(idStr)} className="cursor-pointer" />
                      </td>
                      <td className="px-3 py-2 font-bold text-slate-900 whitespace-nowrap">{r.Chamado || "—"}</td>
                      {tabela === "recall" && (
                        <td className="px-3 py-2 whitespace-nowrap font-semibold text-emerald-700">
                          {r.glpi || r.GLPI ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              {r.glpi || r.GLPI}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span>{r.Loja || "—"}</span>
                          {(r.parceiro || getParceiroByLoja(r.Loja)) && (
                            <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded px-1.5 py-0.5" title={`Parceiro: ${r.parceiro || getParceiroByLoja(r.Loja)}`}>
                              P: {r.parceiro || getParceiroByLoja(r.Loja)}
                            </span>
                          )}
                        </div>
                      </td>
                      {tabela === "recall" && <td className="px-3 py-2 whitespace-nowrap font-bold text-emerald-700">{r.referencia || r.Referencia || "—"}</td>}
                      <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-700">{nfVal}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.CD || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{fmtBR(r["Dt Abertura"])}</td>
                      <td className="px-3 py-2 max-w-[220px] truncate" title={tarefaAtual(r)}>{tarefaAtual(r)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{statusBadge(r["Status Chamado"])}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{slaBadge(r["Dt Abertura"], r["Dt Finalização"])}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap font-bold text-emerald-700 font-mono">{valFmt}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => idStr && setEditingId(idStr)} title="Editar" className="inline-flex items-center p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => idStr && excluirIds([idStr])} title="Excluir" className="inline-flex items-center p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg ml-0.5 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  );
                })}
                {linhas.length === 0 && <tr><td colSpan={11} className="px-4 py-8 text-center text-slate-400">Nenhum chamado encontrado para os filtros selecionados.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <Pagination page={page} totalPages={totalPages} onChange={setPage} totalItems={linhas.length} pageSize={PAGE_SIZE} />
      </div>

      {editingId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-1">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-[99vw] h-[99vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-2 border-b border-slate-200 bg-white shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-800">Editar Chamado</h2>
              </div>
              <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 min-h-0 p-3 overflow-hidden">
              <ErrorBoundary fallbackTitle="Erro ao carregar o formulário de edição">
                <ChamadoForm
                  mode="editar" chamadoId={String(editingId)} compact tabela={tabela}
                  onSaved={() => { onChanged?.(); }}
                  onCancel={() => setEditingId(null)}
                  onDeleted={() => { setEditingId(null); onChanged?.(); }}
                />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-1">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-[99vw] h-[99vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-2 border-b border-slate-200 bg-white shrink-0">
              <h2 className="text-base font-bold text-slate-800">{tabela === "recall" ? "Novo Chamado de Recall" : "Novo Chamado"}</h2>
              <button onClick={() => setCreating(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 min-h-0 p-3 overflow-hidden">
              <ErrorBoundary fallbackTitle="Erro ao carregar o formulário de inclusão">
                <ChamadoForm
                  mode="novo" compact tabela={tabela}
                  onSaved={() => { setCreating(false); onChanged?.(); }}
                  onCancel={() => setCreating(false)}
                />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      )}

      {modalMudarTarefa && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
                  <Workflow className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">Alterar Tarefa em Massa</h2>
                  <p className="text-xs text-slate-500">Mudar a situação de todos os chamados selecionados</p>
                </div>
              </div>
              <button
                onClick={() => !salvandoLote && setModalMudarTarefa(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between bg-emerald-50/60 border border-emerald-200/60 rounded-xl px-4 py-2.5">
                <span className="text-xs font-medium text-emerald-800">Chamados selecionados:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300/60">
                  {selected.size} chamado(s)
                </span>
              </div>

              {chamadosSelecionadosList.length > 0 && (
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Lista de Chamados:
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs">
                    {chamadosSelecionadosList.map((c: any) => (
                      <span key={c.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold text-[11px] shadow-2xs">
                        #{c.Chamado || c.chamado || "S/N"}
                        {c.Loja ? <span className="text-slate-400 font-normal">| Lj {c.Loja}</span> : null}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Selecione a Nova Tarefa / Situação <span className="text-rose-500">*</span>
                </label>
                <select
                  value={novaTarefaSelecionada}
                  onChange={(e) => setNovaTarefaSelecionada(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none shadow-xs cursor-pointer"
                >
                  <option value="">— Selecione a nova tarefa —</option>
                  {todasTarefasOpcoes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 font-medium mt-1.5">
                  A situação atual será atualizada e uma nova etapa será registrada no histórico de cada chamado selecionado.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setModalMudarTarefa(false)}
                disabled={salvandoLote}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executarMudancaTarefaLote}
                disabled={salvandoLote || !novaTarefaSelecionada}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {salvandoLote ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Atualizando {selected.size} chamado(s)...</span>
                  </>
                ) : (
                  <>
                    <Workflow className="w-4 h-4" />
                    <span>Confirmar Alteração ({selected.size})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
