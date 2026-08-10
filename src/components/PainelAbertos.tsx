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
    <div className="flex-1 overflow-auto bg-[#EAECEB] p-4 md:p-6 space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <FileText className="w-6 h-6 text-emerald-700" /> Chamados em Aberto
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Painel operacional — chamados não finalizados abertos desde 01/01/{new Date().getFullYear()} até hoje. SLA limite de {SLA_LIMITE} dias úteis.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CardKpi label="Em Aberto" value={counts.total} icon={FileText} tone="slate" onClick={() => setAlertaFilter("todos")} active={alertaFilter === "todos"} />
        <CardKpi label="No Prazo" value={counts.prazo} icon={CheckCircle2} tone="emerald" onClick={() => setAlertaFilter("prazo")} active={alertaFilter === "prazo"} />
        <CardKpi label="Atenção (≥ 45d)" value={counts.atencao} icon={Clock} tone="amber" onClick={() => setAlertaFilter("atencao")} active={alertaFilter === "atencao"} />
        <CardKpi label="Vencidos (> 60d)" value={counts.vencido} icon={AlertTriangle} tone="rose" onClick={() => setAlertaFilter("vencido")} active={alertaFilter === "vencido"} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">
        {error && (
          <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
            Erro ao carregar os chamados: {error}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-3 p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative flex-1 min-w-[240px]">
            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Buscar</label>
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-[36px] -translate-y-1/2" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Chamado, loja, tarefa, status..."
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs transition-all" />
          </div>
          <div className="flex flex-col w-[110px]">
            <label className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">CD</label>
            <select value={cdFilter} onChange={(e) => setCdFilter(e.target.value as any)} className="px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
              <option value="Todos">Todos</option>
              <option value="ES">ES</option>
              <option value="PB">PB</option>
            </select>
          </div>
          <div className="flex flex-col w-[180px]">
            <label className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
              {statusOpts.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex flex-col w-[220px]">
            <label className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Tarefa atual</label>
            <select value={tarefaFilter} onChange={(e) => setTarefaFilter(e.target.value)} className="px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
              {tarefaOpts.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex flex-col w-[140px]">
            <label className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Loja</label>
            <select value={lojaFilter} onChange={(e) => setLojaFilter(e.target.value)} className="px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
              {lojaOpts.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <span className="ml-auto text-xs font-medium text-slate-500 pb-1">{filtered.length} de {rows.length} chamados</span>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-xs table-auto">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3.5 w-[120px]">Alerta</th>
                <th className="text-left px-4 py-3.5 w-[110px]">Chamado</th>
                <th className="text-left px-4 py-3.5 w-[90px]">Loja</th>
                <th className="text-left px-4 py-3.5 w-[70px]">CD</th>
                <th className="text-left px-4 py-3.5">Tarefa Atual</th>
                <th className="text-left px-4 py-3.5 w-[180px]">Status</th>
                <th className="text-left px-4 py-3.5 w-[120px]">Dt Abertura</th>
                <th className="text-right px-4 py-3.5 w-[90px]">Dias úteis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    Carregando chamados...
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Nenhum chamado encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => (
                  <tr
                    key={r.id}
                    onDoubleClick={() => setEditingId(r.id)}
                    onClick={() => setEditingId(r.id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer select-none"
                  >
                    <td className="px-4 py-3"><AlertBadge alerta={r.alerta} /></td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{r.chamado}</td>
                    <td className="px-4 py-3">{r.loja}</td>
                    <td className="px-4 py-3 font-medium text-slate-600">{r.cd}</td>
                    <td className="px-4 py-3 max-w-[220px] truncate" title={r.tarefa}>{r.tarefa}</td>
                    <td className="px-4 py-3 max-w-[180px] truncate" title={r.status}>{r.status}</td>
                    <td className="px-4 py-3 text-slate-500">{fmtBR(r.dtAbertura)}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{r.dias}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-500 bg-slate-50/40">
            <span>Página {page} de {totalPages}</span>
            <div className="flex gap-1.5">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white disabled:opacity-40 hover:bg-slate-50">Anterior</button>
              <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white disabled:opacity-40 hover:bg-slate-50">Próxima</button>
            </div>
          </div>
        )}
      </div>

      {editingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[85vh] overflow-y-auto relative">
            <button onClick={() => setEditingId(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <div className="p-6">
              <ChamadoForm
                mode="editar"
                chamadoId={editingId}
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
  if (alerta === "vencido") return <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>Vencido</span>;
  if (alerta === "atencao") return <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Atenção</span>;
  return <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>No prazo</span>;
}

function CardKpi({ label, value, icon: Icon, tone, onClick, active }: any) {
  const tones: Record<string, { bg: string; text: string }> = {
    slate: { bg: "bg-slate-100", text: "text-slate-700" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700" },
    amber: { bg: "bg-amber-50", text: "text-amber-700" },
    rose: { bg: "bg-rose-50", text: "text-rose-700" },
  };
  const t = tones[tone] || tones.slate;
  return (
    <button onClick={onClick} className={`text-left bg-white p-4 rounded-2xl border shadow-[0_2px_10px_rgba(0,0,0,0.03)] transition-all hover:shadow-md cursor-pointer ${active ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-slate-200/80"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${t.bg} ${t.text}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
    </button>
  );
}
