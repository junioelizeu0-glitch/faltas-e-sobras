import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Search, X, Pencil, Trash2, DownloadCloud, UploadCloud, Loader2, Plus, FileText } from "lucide-react";
import { parseDataBR } from "@/lib/data-processing";
import { deleteChamado } from "@/lib/chamados.functions";
import { pullFromAppsScript, pushToAppsScript } from "@/lib/sync.functions";
import ChamadoForm from "./ChamadoForm";
import ErrorBoundary from "./ErrorBoundary";
import Pagination from "./Pagination";

const PAGE_SIZE = 30;

const STATUS_CHAMADO_OPCOES = ["Pendente Monitoramento", "Aprovado", "Recusado"];

const FERIADOS = new Set(["01-01","04-21","05-01","09-07","10-12","11-02","11-15","12-25"]);
function isDiaUtil(d: Date) {
  const dow = d.getDay(); if (dow === 0 || dow === 6) return false;
  return !FERIADOS.has(`${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);
}
function diasUteisEntre(i: Date, f: Date) {
  if (f < i) return 0;
  let c = 0; const cur = new Date(i.getFullYear(),i.getMonth(),i.getDate()); const end = new Date(f.getFullYear(),f.getMonth(),f.getDate());
  while (cur <= end) { if (isDiaUtil(cur)) c++; cur.setDate(cur.getDate()+1); }
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

type Props = { rawData: any[] | undefined; onChanged?: () => void; tabela?: "faltas" | "recall" };

export default function ConsultaChamados({ rawData, onChanged, tabela = "faltas" }: Props) {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [filtroTarefa, setFiltroTarefa] = useState("Todas");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [syncing, setSyncing] = useState<"pull" | "push" | null>(null);
  const delFn = useServerFn(deleteChamado);
  const pullFn = useServerFn(pullFromAppsScript);
  const pushFn = useServerFn(pushToAppsScript);

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

  const linhas = useMemo(() => {
    const f = busca.trim().toLowerCase();
    return (rawData || [])
      .filter((r: any) => {
        if (filtroStatus !== "Todos" && String(r["Status Chamado"] || "") !== filtroStatus) return false;
        const t = tarefaAtual(r);
        if (filtroTarefa !== "Todas" && t !== filtroTarefa) return false;
        if (!f) return true;
        return [r.Chamado, r.Loja, r.NF, r.CD, r.Transportadora, r.Conferente, t]
          .map((v) => String(v ?? "").toLowerCase()).some((s) => s.includes(f));
      })
      .sort((a: any, b: any) => (parseDataBR(b["Dt Abertura"])?.getTime() ?? 0) - (parseDataBR(a["Dt Abertura"])?.getTime() ?? 0));
  }, [rawData, busca, filtroStatus, filtroTarefa]);

  useEffect(() => { setPage(0); }, [busca, filtroStatus, filtroTarefa]);
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
            <p className="text-xs text-slate-500 mt-1">
              {selected.size > 0 ? `${selected.size} selecionado(s) de ${linhas.length}` : `Clique em um chamado para abrir os detalhes e editar. Total: ${linhas.length} chamados`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCreating(true)}
              title="Novo chamado"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl cursor-pointer shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4"/>
              <span>Novo Chamado</span>
            </button>
            <button
              onClick={doPull}
              disabled={syncing !== null}
              title="Puxar dados atualizados da API"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl disabled:opacity-40 transition-colors cursor-pointer bg-white"
            >
              {syncing === "pull" ? <Loader2 className="w-4 h-4 animate-spin"/> : <DownloadCloud className="w-4 h-4 text-emerald-700"/>}
              <span>Puxar da API</span>
            </button>
            <button
              onClick={doPush}
              disabled={syncing !== null}
              title="Enviar dados do banco para a API"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl disabled:opacity-40 transition-colors cursor-pointer bg-white"
            >
              {syncing === "push" ? <Loader2 className="w-4 h-4 animate-spin"/> : <UploadCloud className="w-4 h-4 text-emerald-700"/>}
              <span>Enviar p/ API</span>
            </button>
            <button
              onClick={abrirEditarSelecionado}
              disabled={selected.size !== 1}
              title="Alterar"
              className="inline-flex items-center p-2 text-emerald-700 hover:bg-emerald-50 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-slate-200 bg-white"
            >
              <Pencil className="w-4 h-4"/>
            </button>
            <button
              onClick={() => excluirIds(Array.from(selected))}
              disabled={selected.size === 0}
              title="Excluir"
              className="inline-flex items-center p-2 text-rose-600 hover:bg-rose-50 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-slate-200 bg-white"
            >
              <Trash2 className="w-4 h-4"/>
            </button>
          </div>
        </header>

        <div className="flex flex-wrap gap-4 bg-slate-50/70 border border-slate-200/60 rounded-xl p-3.5 items-end text-xs">
          <div className="relative w-[260px] min-w-[180px]">
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Buscar chamado</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Chamado, loja, NF..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
              />
            </div>
          </div>
          <div className="flex flex-col min-w-[160px]">
            <label className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Status chamado</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white cursor-pointer font-semibold outline-none focus:border-emerald-500"
            >
              <option>Todos</option>
              {STATUS_CHAMADO_OPCOES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex flex-col min-w-[200px] flex-1 max-w-md">
            <label className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Tarefa atual</label>
            <select
              value={filtroTarefa}
              onChange={(e) => setFiltroTarefa(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white cursor-pointer font-semibold outline-none focus:border-emerald-500"
            >
              <option>Todas</option>
              {tarefas.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-auto max-h-[600px]">
            <table className="min-w-full text-xs text-left border-collapse">
              <thead className="sticky top-0 z-20 bg-slate-100 text-[11px] uppercase tracking-wider text-slate-700 shadow-2xs">
                <tr className="bg-slate-100">
                  <th className="sticky top-0 z-20 bg-slate-100 w-8 px-3 py-3"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="cursor-pointer"/></th>
                  <th className="sticky top-0 z-20 bg-slate-100 px-4 py-3 font-bold">Chamado</th>
                  <th className="sticky top-0 z-20 bg-slate-100 px-4 py-3 font-bold">Loja</th>
                  <th className="text-left px-3 py-2 font-semibold">CD</th>
                  <th className="text-left px-3 py-2 font-semibold">Abertura</th>
                  <th className="text-left px-3 py-2 font-semibold">Tarefa Atual</th>
                  <th className="text-left px-3 py-2 font-semibold">Status</th>
                  <th className="text-left px-3 py-2 font-semibold">SLA (dias úteis)</th>
                  <th className="text-right px-3 py-2 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginadas.map((r: any) => {
                  const idStr = r.id != null ? String(r.id) : "";
                  return (
                    <tr
                      key={idStr || r.Chamado}
                      onClick={() => idStr && setEditingId(idStr)}
                      onDoubleClick={() => idStr && setEditingId(idStr)}
                      className={`border-b border-slate-100 hover:bg-blue-50/60 cursor-pointer select-none transition-colors ${idStr && selected.has(idStr) ? "bg-blue-50/80" : ""}`}
                    >
                      <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={idStr ? selected.has(idStr) : false} onChange={() => idStr && toggleOne(idStr)} className="cursor-pointer"/>
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-800 whitespace-nowrap">{r.Chamado || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.Loja || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.CD || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{fmtBR(r["Dt Abertura"])}</td>
                      <td className="px-3 py-2 max-w-[240px] truncate" title={tarefaAtual(r)}>{tarefaAtual(r)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{statusBadge(r["Status Chamado"])}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{slaBadge(r["Dt Abertura"], r["Dt Finalização"])}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => idStr && setEditingId(idStr)} title="Editar" className="inline-flex items-center p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-3.5 h-3.5"/></button>
                        <button onClick={() => idStr && excluirIds([idStr])} title="Excluir" className="inline-flex items-center p-1.5 text-red-500 hover:bg-red-50 rounded ml-0.5"><Trash2 className="w-3.5 h-3.5"/></button>
                      </td>
                    </tr>
                  );
                })}
                {linhas.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">Nenhum chamado encontrado.</td></tr>}
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
              <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5"/></button>
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
              <h2 className="text-base font-bold text-slate-800">Novo Chamado</h2>
              <button onClick={() => setCreating(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5"/></button>
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
    </div>
  );
}
