import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCcw, Search } from "lucide-react";
import { listAuditLog } from "@/lib/audit.functions";

const TABLES = ["", "chamados_faltas", "chamados_etapas", "chamados_referencias", "lojas", "transportadoras", "conferentes", "motivos", "tarefas_catalogo"];
const ACTIONS = ["", "INSERT", "UPDATE", "DELETE"];

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR");
};

const badgeCls = (a: string) =>
  a === "INSERT" ? "bg-green-100 text-green-700" : a === "UPDATE" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700";

export default function AuditLogViewer() {
  const listFn = useServerFn(listAuditLog);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [table, setTable] = useState("");
  const [action, setAction] = useState("");
  const [chamado, setChamado] = useState("");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const load = async () => {
    setLoading(true);
    try {
      const data: any = await listFn({ data: { table: table || undefined, action: action || undefined, chamado: chamado || undefined, limit: 500 } });
      setRows(data || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Log de Alterações</h1>
        <button onClick={load} className="inline-flex items-center gap-1 px-3 py-2 text-sm text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50">
          <RefreshCcw className="w-4 h-4" />Atualizar
        </button>
      </header>

      <div className="bg-white p-3 rounded-lg border border-slate-200 mb-3 flex flex-wrap gap-2 items-end">
        <label className="flex flex-col text-xs font-semibold text-slate-600">Tabela
          <select value={table} onChange={(e) => setTable(e.target.value)} className="mt-1 text-sm border border-slate-300 rounded-md px-2 py-1.5">
            {TABLES.map((t) => <option key={t} value={t}>{t || "Todas"}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-xs font-semibold text-slate-600">Ação
          <select value={action} onChange={(e) => setAction(e.target.value)} className="mt-1 text-sm border border-slate-300 rounded-md px-2 py-1.5">
            {ACTIONS.map((t) => <option key={t} value={t}>{t || "Todas"}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-xs font-semibold text-slate-600">Nº Chamado
          <input value={chamado} onChange={(e) => setChamado(e.target.value)} className="mt-1 text-sm border border-slate-300 rounded-md px-2 py-1.5" placeholder="ex: 123456" />
        </label>
        <button onClick={load} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md">
          <Search className="w-4 h-4"/>Filtrar
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-6 flex justify-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin mr-2"/>Carregando...</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">Nenhum registro.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px]">
              <tr>
                <th className="px-3 py-2 text-left">Data</th>
                <th className="px-3 py-2 text-left">Tabela</th>
                <th className="px-3 py-2 text-left">Ação</th>
                <th className="px-3 py-2 text-left">Chamado</th>
                <th className="px-3 py-2 text-left">Alterações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const isExp = expanded[r.id];
                const diffKeys = r.diff ? Object.keys(r.diff) : [];
                const preview = r.action === "UPDATE"
                  ? diffKeys.slice(0, 3).map((k) => `${k}`).join(", ") + (diffKeys.length > 3 ? ` +${diffKeys.length - 3}` : "")
                  : r.action === "INSERT" ? "Criado" : "Excluído";
                return (
                  <>
                    <tr key={r.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setExpanded((p) => ({ ...p, [r.id]: !p[r.id] }))}>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-700">{fmtDate(r.created_at)}</td>
                      <td className="px-3 py-2 text-slate-600">{r.table_name}</td>
                      <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded font-semibold ${badgeCls(r.action)}`}>{r.action}</span></td>
                      <td className="px-3 py-2 text-slate-700">{r.chamado_num || "—"}</td>
                      <td className="px-3 py-2 text-slate-600">{preview}</td>
                    </tr>
                    {isExp && (
                      <tr key={`${r.id}-x`} className="bg-slate-50">
                        <td colSpan={5} className="px-3 py-3">
                          {r.action === "UPDATE" && r.diff ? (
                            <div className="space-y-1">
                              {Object.entries(r.diff).map(([k, v]: any) => (
                                <div key={k} className="text-xs">
                                  <span className="font-semibold text-slate-700">{k}:</span>{" "}
                                  <span className="line-through text-red-500">{JSON.stringify(v.old)}</span>{" → "}
                                  <span className="text-green-700">{JSON.stringify(v.new)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <pre className="text-[11px] bg-white border border-slate-200 rounded p-2 overflow-auto max-h-64">
                              {JSON.stringify(r.new_data || r.old_data, null, 2)}
                            </pre>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
