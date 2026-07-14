import { useMemo, useState } from "react";
import { AlertTriangle, Clock, CheckCircle2, Search, FileText, Loader2 } from "lucide-react";
import { parseDataBR, getBusinessDays, getTarefaAtual, isSemRetorno } from "@/lib/data-processing";

type Props = {
  rawData: any[] | undefined;
  isLoading?: boolean;
  onOpenChamado?: (id: string) => void;
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
  const st = String(r["Status Chamado"] || "").toLowerCase().trim();
  if (["aprovado", "recusado", "cancelado", "finalizado"].includes(st)) return true;
  const dtFin = String(r["Dt Finalização"] || "").trim();
  if (dtFin !== "") return true;
  if (isSemRetorno(r)) return true;
  return false;
}

export default function PainelAbertos({ rawData, isLoading, onOpenChamado }: Props) {
  const [query, setQuery] = useState("");
  const [cdFilter, setCdFilter] = useState<string>("Todos");
  const [alertaFilter, setAlertaFilter] = useState<"todos" | "vencido" | "atencao" | "prazo">("todos");

  const rows = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    const inicioAno = new Date(hoje.getFullYear(), 0, 1, 0, 0, 0, 0);
    const list = (rawData || [])
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
          cd: r.CD || "",
          tipo: r.Tipo || "",
          tarefa: getTarefaAtual(r) || r["Situação "] || r["Situação"] || "—",
          status: r["Status Chamado"] || "",
          dtAbertura: r["Dt Abertura"],
          dias,
          alerta,
        };
      });
    return list.sort((a, b) => b.dias - a.dias);
  }, [rawData]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (cdFilter !== "Todos" && String(r.cd) !== cdFilter) return false;
      if (alertaFilter !== "todos" && r.alerta !== alertaFilter) return false;
      if (!q) return true;
      return (
        String(r.chamado).toLowerCase().includes(q) ||
        String(r.loja).toLowerCase().includes(q) ||
        String(r.tarefa).toLowerCase().includes(q) ||
        String(r.status).toLowerCase().includes(q) ||
        String(r.tipo).toLowerCase().includes(q)
      );
    });
  }, [rows, query, cdFilter, alertaFilter]);

  const counts = useMemo(() => {
    const c = { total: rows.length, vencido: 0, atencao: 0, prazo: 0 };
    rows.forEach((r) => { c[r.alerta] += 1; });
    return c;
  }, [rows]);

  const cds = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => { if (r.cd) s.add(String(r.cd)); });
    return ["Todos", ...Array.from(s).sort()];
  }, [rows]);

  const [page, setPage] = useState(1);
  const pageSize = 30;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-4 md:p-6">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" /> Chamados em Aberto
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Painel operacional — apenas chamados não finalizados. Alerta baseado em SLA de {SLA_LIMITE} dias úteis desde a abertura.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <CardKpi label="Em Aberto" value={counts.total} icon={FileText} tone="slate" onClick={() => setAlertaFilter("todos")} active={alertaFilter === "todos"} />
        <CardKpi label="No Prazo" value={counts.prazo} icon={CheckCircle2} tone="emerald" onClick={() => setAlertaFilter("prazo")} active={alertaFilter === "prazo"} />
        <CardKpi label="Atenção (≥ 45d)" value={counts.atencao} icon={Clock} tone="amber" onClick={() => setAlertaFilter("atencao")} active={alertaFilter === "atencao"} />
        <CardKpi label="Vencidos (> 60d)" value={counts.vencido} icon={AlertTriangle} tone="rose" onClick={() => setAlertaFilter("vencido")} active={alertaFilter === "vencido"} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-100">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Buscar chamado, loja, tarefa, status..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={cdFilter} onChange={(e) => { setCdFilter(e.target.value); setPage(1); }} className="px-3 py-2 text-sm border border-slate-300 rounded-md">
            {cds.map((c) => <option key={c} value={c}>{c === "Todos" ? "Todos os CDs" : `CD ${c}`}</option>)}
          </select>
          {alertaFilter !== "todos" && (
            <button onClick={() => setAlertaFilter("todos")} className="text-xs px-2 py-1 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50">Limpar alerta</button>
          )}
          <span className="ml-auto text-xs text-slate-500">{filtered.length} de {rows.length} chamados</span>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Alerta</th>
                <th className="text-left px-3 py-2 font-semibold">Chamado</th>
                <th className="text-left px-3 py-2 font-semibold">Loja</th>
                <th className="text-left px-3 py-2 font-semibold">CD</th>
                <th className="text-left px-3 py-2 font-semibold">Tipo</th>
                <th className="text-left px-3 py-2 font-semibold">Tarefa Atual</th>
                <th className="text-left px-3 py-2 font-semibold">Status</th>
                <th className="text-left px-3 py-2 font-semibold">Dt Abertura</th>
                <th className="text-right px-3 py-2 font-semibold">Dias úteis</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={9} className="text-center py-10 text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />Carregando...</td></tr>
              )}
              {!isLoading && pageRows.length === 0 && (
                <tr><td colSpan={9} className="text-center py-10 text-slate-400">Nenhum chamado em aberto encontrado.</td></tr>
              )}
              {!isLoading && pageRows.map((r, i) => (
                <tr key={`${r.chamado}-${i}`} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => onOpenChamado?.(String(r.chamado))}>
                  <td className="px-3 py-2"><AlertBadge alerta={r.alerta} /></td>
                  <td className="px-3 py-2 font-semibold text-slate-800">{r.chamado}</td>
                  <td className="px-3 py-2 text-slate-700">{r.loja}</td>
                  <td className="px-3 py-2 text-slate-700">{r.cd || "—"}</td>
                  <td className="px-3 py-2 text-slate-700">{r.tipo || "—"}</td>
                  <td className="px-3 py-2 text-slate-700">{r.tarefa}</td>
                  <td className="px-3 py-2 text-slate-700">{r.status || "—"}</td>
                  <td className="px-3 py-2 text-slate-700">{fmtBR(r.dtAbertura)}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-800">{r.dias}</td>
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
