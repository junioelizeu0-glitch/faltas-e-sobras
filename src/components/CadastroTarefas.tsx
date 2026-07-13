import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Loader2, Save, X, Pencil, Trash2 } from "lucide-react";
import { listAllTarefas, upsertTarefa, deleteTarefa } from "@/lib/chamados.functions";

type T = { id: string; nome: string; dias_uteis: number; aplica_faltas: boolean; aplica_sobras: boolean; ativo: boolean; ordem: number };

export default function CadastroTarefas() {
  const list = useServerFn(listAllTarefas);
  const up = useServerFn(upsertTarefa);
  const del = useServerFn(deleteTarefa);
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<T> | null>(null);

  const load = async () => { setLoading(true); try { setRows(await list() as any); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.nome) return;
    await up({ data: {
      id: editing.id, nome: editing.nome, dias_uteis: Number(editing.dias_uteis) || 1,
      aplica_faltas: !!editing.aplica_faltas, aplica_sobras: !!editing.aplica_sobras,
      ativo: editing.ativo !== false, ordem: Number(editing.ordem) || 0,
    }});
    setEditing(null); await load();
  };
  const remove = async (id: string) => {
    if (!confirm("Remover tarefa?")) return;
    await del({ data: { id } }); await load();
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-4">
      <div className="w-full">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Cadastro de Tarefas (Etapas)</h1>
            <p className="text-sm text-slate-500 mt-1">Define nome, SLA em dias úteis e a qual tipo de chamado se aplica.</p>
          </div>
          <button onClick={() => setEditing({ ativo: true, aplica_faltas: true, dias_uteis: 2, ordem: (rows.length + 1) * 10 })} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md"><Plus className="w-4 h-4"/>Nova tarefa</button>
        </header>
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          {loading ? <div className="p-8 text-center"><Loader2 className="inline w-5 h-5 animate-spin mr-2"/>Carregando...</div> : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b text-xs uppercase text-slate-500">
                <tr>
                  <th className="text-left px-3 py-2">Ordem</th><th className="text-left px-3 py-2">Nome</th>
                  <th className="text-left px-3 py-2">SLA</th><th className="text-left px-3 py-2">Faltas</th>
                  <th className="text-left px-3 py-2">Sobras</th><th className="text-left px-3 py-2">Ativo</th>
                  <th className="text-right px-3 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2">{r.ordem}</td>
                    <td className="px-3 py-2 font-semibold">{r.nome}</td>
                    <td className="px-3 py-2">{r.dias_uteis} du</td>
                    <td className="px-3 py-2">{r.aplica_faltas ? "✓" : "—"}</td>
                    <td className="px-3 py-2">{r.aplica_sobras ? "✓" : "—"}</td>
                    <td className="px-3 py-2">{r.ativo ? "Sim" : "Não"}</td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <button onClick={() => setEditing(r)} title="Editar" className="inline-flex items-center p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-3.5 h-3.5"/></button>
                      <button onClick={() => remove(r.id)} title="Excluir" className="inline-flex items-center p-1.5 text-red-500 hover:bg-red-50 rounded ml-0.5"><Trash2 className="w-3.5 h-3.5"/></button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400">Nenhuma tarefa.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold">{editing.id ? "Editar" : "Nova"} tarefa</h3>
              <button onClick={() => setEditing(null)}><X className="w-5 h-5 text-slate-400"/></button>
            </div>
            <div className="p-4 space-y-3">
              <label className="block"><span className="text-xs font-semibold text-slate-600">Nome</span>
                <input autoFocus value={editing.nome || ""} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} className="mt-1 w-full text-sm rounded-md border border-slate-300 px-3 py-2"/></label>
              <div className="grid grid-cols-2 gap-3">
                <label><span className="text-xs font-semibold text-slate-600">SLA (dias úteis)</span>
                  <input type="number" min={0} value={editing.dias_uteis ?? 1} onChange={(e) => setEditing({ ...editing, dias_uteis: Number(e.target.value) })} className="mt-1 w-full text-sm rounded-md border border-slate-300 px-3 py-2"/></label>
                <label><span className="text-xs font-semibold text-slate-600">Ordem</span>
                  <input type="number" value={editing.ordem ?? 0} onChange={(e) => setEditing({ ...editing, ordem: Number(e.target.value) })} className="mt-1 w-full text-sm rounded-md border border-slate-300 px-3 py-2"/></label>
              </div>
              <div className="flex gap-4 text-sm">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!editing.aplica_faltas} onChange={(e) => setEditing({ ...editing, aplica_faltas: e.target.checked })}/>Faltas</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!editing.aplica_sobras} onChange={(e) => setEditing({ ...editing, aplica_sobras: e.target.checked })}/>Sobras</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={editing.ativo !== false} onChange={(e) => setEditing({ ...editing, ativo: e.target.checked })}/>Ativo</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t bg-slate-50">
              <button onClick={() => setEditing(null)} className="px-3 py-2 text-sm text-slate-600">Cancelar</button>
              <button onClick={save} className="inline-flex items-center gap-1 px-3 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md"><Save className="w-4 h-4"/>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
