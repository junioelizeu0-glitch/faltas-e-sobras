import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock, CheckCircle2, Search, FileText, Loader2, X } from "lucide-react";
import { parseDataBR, getBusinessDays } from "@/lib/data-processing";
import ChamadoForm from "./ChamadoForm";

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

export default function PainelAbertos({ rawData, isLoading, error, onChanged }: Props) {
  const [query, setQuery] = useState("");
  const [cdFilter, setCdFilter] = useState<"Todos" | "ES" | "PB">("Todos");
  const [alertaFilter, setAlertaFilter] = useState<"todos" | "vencido" | "atencao" | "prazo">("todos");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [tarefaFilter, setTarefaFilter] = useState<string>("Todas");
  const [lojaFilter, setLojaFilter] = useState<string>("Todas");
  const [editingId, setEditingId] = useState<string | null>(null);

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
        return {
          id: r.id || r._id || r.Chamado,
          chamado: r.Chamado,
          loja: r.Loja,
          cd: siglaCD(r.CD),
          tipo: r.Tipo || "",
          tarefa: (String(r["Situação "] ?? r["Situação"] ?? r.situacao ?? "").trim()) || "—",
          status: r["Status Chamado"] || "",
          dtAbertura: r["Dt Abertura"],
          dias,
          alerta,
        };
      })
      .sort((a, b) => b.dias - a.dias);
  }, [rawData]);

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

  const [page, setPage] = useState(1);
  const pageSize = 30;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { setPage(1); }, [query, cdFilter, alertaFilter, statusFilter, tarefaFilter, lojaFilter]);

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-4 md:p-6">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" /> Chamados em Aberto
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Painel operacional — chamados não finalizados abertos desde 01/01/{new Date().getFullYear()} até hoje. Alerta baseado em SLA de {SLA_LIMITE} dias úteis.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <CardKpi label="Em Aberto" value={counts.total} icon={FileText} tone="slate" onClick={() => setAlertaFilter("todos")} active={alertaFilter === "todos"} />
        <CardKpi label="No Prazo" value={counts.prazo} icon={CheckCircle2} tone="emerald" onClick={() => setAlertaFilter("prazo")} active={alertaFilter === "prazo"} />
        <CardKpi label="Atenção (≥ 45d)" value={counts.atencao} icon={Clock} tone="amber" onClick={() => setAlertaFilter("atencao")} active={alertaFilter === "atencao"} />
        <CardKpi label="Vencidos (> 60d)" value={counts.vencido} icon={AlertTriangle} tone="rose" onClick={() => setAlertaFilter("vencido")} active={alertaFilter === "vencido"} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        {error && (
          <div className="m-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            Erro ao carregar os chamados: {error}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-2 p-3 border-b border-slate-100">
          <div className="relative flex-1 min-w-[220px]">
            <label className="block text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wide">Buscar</label>
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-[34px] -translate-y-1/2" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Chamado, loja, tarefa, status..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex flex-col w-[110px]">
            <label className="text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wide">CD</label>
            <select value={cdFilter} onChange={(e) => setCdFilter(e.target.value as any)} className="px-2 py-2 text-sm border border-slate-300 rounded-md bg-white">
              <option value="Todos">Todos</option>
              <option value="ES">ES</option>
              <option value="PB">PB</option>
            </select>
          </div>
          <div className="flex flex-col w-[180px]">
            <label className="text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wide">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-2 py-2 text-sm border border-slate-300 rounded-md bg-white">
              {statusOpts.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex flex-col w-[220px]">
            <label className="text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wide">Tarefa atual</label>
            <select value={tarefaFilter} onChange={(e) => setTarefaFilter(e.target.value)} className="px-2 py-2 text-sm border border-slate-300 rounded-md bg-white">
              {tarefaOpts.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex flex-col w-[140px]">
            <label className="text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wide">Loja</label>
            <select value={lojaFilter} onChange={(e) => setLojaFilter(e.target.value)} className="px-2 py-2 text-sm border border-slate-300 rounded-md bg-white">
              {lojaOpts.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <span className="ml-auto text-xs text-slate-500 pb-1">{filtered.length} de {rows.length} chamados</span>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm table-auto">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-2 py-2 font-semibold w-[110px]">Alerta</th>
                <th className="text-left px-2 py-2 font-semibold w-[100px]">Chamado</th>
                <th className="text-left px-2 py-2 font-semibold w-[80px]">Loja</th>
                <th className="text-left px-2 py-2 font-semibold w-[60px]">CD</th>
                <th className="text-left px-2 py-2 font-semibold">Tarefa Atual</th>
                <th className="text-left px-2 py-2 font-semibold w-[170px]">Status</th>
                <th className="text-left px-2 py-2 font-semibold w-[110px]">Dt Abertura</th>
                <th className="text-right px-2 py-2 font-semibold w-[80px]">Dias úteis</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="text-center py-10 text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />Carregando...</td></tr>
              )}
              {!isLoading && error && (
                <tr><td colSpan={8} className="text-center py-10 text-rose-500">Não foi possível carregar os dados. Tente atualizar a página.</td></tr>
              )}
              {!isLoading && !error && pageRows.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">Nenhum chamado em aberto encontrado.</td></tr>
              )}
              {!isLoading && !error && pageRows.map((r, i) => (
                <tr
                  key={`${r.chamado}-${i}`}
                  onClick={() => r.id && setEditingId(String(r.id))}
                  onDoubleClick={() => r.id && setEditingId(String(r.id))}
                  className="border-t border-slate-100 hover:bg-blue-50/60 cursor-pointer select-none transition-colors"
                >
                  <td className="px-2 py-2"><AlertBadge alerta={r.alerta} /></td>
                  <td className="px-2 py-2 font-semibold text-slate-800 whitespace-nowrap">{r.chamado}</td>
                  <td className="px-2 py-2 text-slate-700 whitespace-nowrap">{r.loja}</td>
                  <td className="px-2 py-2 text-slate-700 whitespace-nowrap">{r.cd || "—"}</td>
                  <td className="px-2 py-2 text-slate-700">{r.tarefa}</td>
                  <td className="px-2 py-2 text-slate-700 whitespace-nowrap">{r.status || "—"}</td>
                  <td className="px-2 py-2 text-slate-700 whitespace-nowrap">{fmtBR(r.dtAbertura)}</td>
                  <td className="px-2 py-2 text-right font-mono text-slate-800">{r.dias}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 text-xs text-slate-600">
            <span>Página {page} de {totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 border border-slate-300 rounded disabled:opacity-40">Anterior</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 border border-slate-300 rounded disabled:opacity-40">Próxima</button>
            </div>
          </div>
        )}
      </div>

      {editingId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] max-h-[92vh] overflow-auto">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold text-slate-800">Editar Chamado</h2>
              <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-4">
              <ChamadoForm
                mode="editar" chamadoId={editingId} compact
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

function AlertBadge({ alerta }: { alerta: "vencido" | "atencao" | "prazo" }) {
  if (alerta === "vencido") return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700"><AlertTriangle className="w-3 h-3" />Vencido</span>;
  if (alerta === "atencao") return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700"><Clock className="w-3 h-3" />Atenção</span>;
  return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3 h-3" />No prazo</span>;
}

function CardKpi({ label, value, icon: Icon, tone, onClick, active }: any) {
  const tones: Record<string, string> = {
    slate: "text-slate-600 bg-slate-50 border-slate-200",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
    rose: "text-rose-600 bg-rose-50 border-rose-100",
  };
  return (
    <button onClick={onClick} className={`text-left bg-white p-3 rounded-xl border shadow-sm transition-all hover:border-blue-300 ${active ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"}`}>
      <div className="flex items-start justify-between mb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tones[tone]}`}><Icon className="w-4 h-4" /></div>
      </div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
    </button>
  );
}
