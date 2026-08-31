import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Loader2, Save, X, Pencil, Trash2 } from "lucide-react";
import { listAllTarefas, upsertTarefa, deleteTarefa } from "@/lib/chamados.functions";
import Pagination from "./Pagination";

const PAGE_SIZE = 30;

type T = { id: string; nome: string; dias_uteis: number; aplica_faltas: boolean; aplica_sobras: boolean; aplica_recall?: boolean; ativo: boolean; ordem: number };

export default function CadastroTarefas() {
  const list = useServerFn(listAllTarefas);
  const up = useServerFn(upsertTarefa);
  const del = useServerFn(deleteTarefa);
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<T> | null>(null);
  const [page, setPage] = useState(0);

  const load = async () => { setLoading(true); try { setRows(await list() as any); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const paginated = useMemo(() => rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [rows, page]);
  useEffect(() => { setPage(0); }, [rows.length]);

  const save = async () => {
    if (!editing?.nome) return;
    await up({ data: {
      id: editing.id, nome: editing.nome, dias_uteis: Number(editing.dias_uteis) || 1,
      aplica_faltas: !!editing.aplica_faltas, aplica_sobras: !!editing.aplica_sobras,
      aplica_recall: !!editing.aplica_recall,
      ativo: editing.ativo !== false, ordem: Number(editing.ordem) || 0,
    }});
    setEditing(null); await load();
  };
  const remove = async (id: string) => {
    if (!confirm("Remover tarefa?")) return;
    await del({ data: { id } }); await load();
  };

  return (
    <div className="flex-1 min-h-screen bg-[#F4F6F5] p-4 md:p-6 space-y-6 text-slate-800 font-sans">
      <div className="w-full bg-white rounded-2xl border border-slate-200/70 shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-6 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Cadastro de Tarefas (Etapas)</h1>
            <p className="text-xs text-slate-500 mt-1">Define nome, SLA em dias úteis e a qual tipo de chamado se aplica.</p>
          </div>
          <button
            onClick={() => setEditing({ ativo: true, aplica_faltas: true, aplica_recall: true })}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl cursor-pointer shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4"/>
            <span>Nova Tarefa</span>
          </button>
        </header>

        <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <Loader2 className="inline w-6 h-6 animate-spin mr-2 text-emerald-600"/>
              <span>Carregando tarefas...</span>
            </div>
          ) : (
            <table className="min-w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Ordem</th>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">SLA</th>
                  <th className="px-4 py-3">Faltas</th>
                  <th className="px-4 py-3">Sobras</th>
                  <th className="px-4 py-3">Recall</th>
                  <th className="px-4 py-3">Ativo</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginated.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-500">{r.ordem}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{r.nome}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{r.dias_uteis} dias úteis</td>
                    <td className="px-4 py-3">{r.aplica_faltas ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3">{r.aplica_sobras ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3">{r.aplica_recall ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3">{r.ativo ? <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">Sim</span> : <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">Não</span>}</td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button onClick={() => setEditing(r)} title="Editar" className="inline-flex items-center p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer">
                        <Pencil className="w-3.5 h-3.5"/>
                      </button>
                      <button onClick={() => remove(r.id)} title="Excluir" className="inline-flex items-center p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      Nenhuma tarefa cadastrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} totalItems={rows.length} pageSize={PAGE_SIZE} />
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900">{editing.id ? "Editar" : "Nova"} Tarefa</h3>
              <button onClick={() => setEditing(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5"/>
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <label className="block">
                <span className="font-semibold text-slate-600">Nome *</span>
                <input autoFocus value={editing.nome || ""} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} placeholder="Ex.: Validação NF Espelho" className="mt-1.5 w-full text-sm rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white font-medium"/>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="font-semibold text-slate-600">SLA (dias úteis)</span>
                  <input type="number" min={0} value={editing.dias_uteis ?? ""} onChange={(e) => setEditing({ ...editing, dias_uteis: e.target.value === "" ? undefined : Number(e.target.value) })} className="mt-1.5 w-full text-sm rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white font-medium"/>
                </label>
                <label className="block">
                  <span className="font-semibold text-slate-600">Ordem</span>
                  <input type="number" value={editing.ordem ?? ""} onChange={(e) => setEditing({ ...editing, ordem: e.target.value === "" ? undefined : Number(e.target.value) })} className="mt-1.5 w-full text-sm rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white font-medium"/>
                </label>
              </div>
              <div className="flex gap-4 text-xs pt-2 flex-wrap">
                <label className="inline-flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input type="checkbox" checked={!!editing.aplica_faltas} onChange={(e) => setEditing({ ...editing, aplica_faltas: e.target.checked })} className="rounded text-emerald-600 focus:ring-emerald-500"/>
                  Faltas
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input type="checkbox" checked={!!editing.aplica_sobras} onChange={(e) => setEditing({ ...editing, aplica_sobras: e.target.checked })} className="rounded text-emerald-600 focus:ring-emerald-500"/>
                  Sobras
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input type="checkbox" checked={!!editing.aplica_recall} onChange={(e) => setEditing({ ...editing, aplica_recall: e.target.checked })} className="rounded text-emerald-600 focus:ring-emerald-500"/>
                  Recall
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input type="checkbox" checked={editing.ativo !== false} onChange={(e) => setEditing({ ...editing, ativo: e.target.checked })} className="rounded text-emerald-600 focus:ring-emerald-500"/>
                  Ativo
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">
                Cancelar
              </button>
              <button onClick={save} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors cursor-pointer shadow-xs">
                <Save className="w-4 h-4"/>
                <span>Salvar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
