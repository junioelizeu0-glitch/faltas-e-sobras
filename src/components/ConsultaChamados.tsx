import { useMemo, useState } from "react";
import { Search, X, Pencil } from "lucide-react";
import { parseDataBR } from "@/lib/data-processing";
import ChamadoForm from "./ChamadoForm";

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

type Props = { rawData: any[] | undefined; onChanged?: () => void };

export default function ConsultaChamados({ rawData, onChanged }: Props) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [editingId, setEditingId] = useState<string | null>(null);

  const linhas = useMemo(() => {
    const f = busca.trim().toLowerCase();
    return (rawData || [])
      .filter((r: any) => {
        if (filtro !== "Todos" && String(r["Status Chamado"] || "") !== filtro) return false;
        if (!f) return true;
        return [r.Chamado, r.Loja, r.NF, r.Transportadora, r.Conferente, r["Situação "]]
          .map((v) => String(v ?? "").toLowerCase()).some((s) => s.includes(f));
      })
      .sort((a: any, b: any) => (parseDataBR(b["Dt Abertura"])?.getTime() ?? 0) - (parseDataBR(a["Dt Abertura"])?.getTime() ?? 0));
  }, [rawData, busca, filtro]);

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-4">
          <h1 className="text-xl font-bold text-slate-800">Consulta de Chamados — Faltas</h1>
          <p className="text-sm text-slate-500 mt-1">Clique em um chamado para editar. Total: {linhas.length}</p>
        </header>

        <div className="flex flex-wrap gap-3 mb-3 bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por chamado, loja, NF, transportadora..." className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
          </div>
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="text-sm border border-slate-200 rounded-md px-3 py-2 bg-white cursor-pointer">
            <option>Todos</option>
            {STATUS_CHAMADO_OPCOES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-260px)]">
            <table className="min-w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Chamado</th>
                  <th className="text-left px-3 py-2 font-semibold">Loja</th>
                  <th className="text-left px-3 py-2 font-semibold">Abertura</th>
                  <th className="text-left px-3 py-2 font-semibold">Tarefa Atual</th>
                  <th className="text-left px-3 py-2 font-semibold">Status</th>
                  <th className="text-left px-3 py-2 font-semibold">SLA (dias úteis)</th>
                  <th className="text-right px-3 py-2 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((r: any) => (
                  <tr key={r.id || r.Chamado} onClick={() => setEditingId(r.id)} className="border-b border-slate-100 hover:bg-blue-50/40 cursor-pointer">
                    <td className="px-3 py-2 font-semibold text-slate-800">{r.Chamado || "—"}</td>
                    <td className="px-3 py-2">{r.Loja || "—"}</td>
                    <td className="px-3 py-2">{fmtBR(r["Dt Abertura"])}</td>
                    <td className="px-3 py-2 max-w-[220px] truncate" title={r["Situação "]}>{r["Situação "] || "—"}</td>
                    <td className="px-3 py-2">{statusBadge(r["Status Chamado"])}</td>
                    <td className="px-3 py-2">{slaBadge(r["Dt Abertura"], r["Dt Finalização"])}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={(e) => { e.stopPropagation(); setEditingId(r.id); }} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-semibold">
                        <Pencil className="w-3.5 h-3.5"/>Editar
                      </button>
                    </td>
                  </tr>
                ))}
                {linhas.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Nenhum chamado encontrado.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editingId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditingId(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-auto">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold text-slate-800">Editar Chamado</h2>
              <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-4">
              <ChamadoForm mode="editar" chamadoId={editingId} compact onSaved={() => { setEditingId(null); onChanged?.(); }} onCancel={() => setEditingId(null)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
