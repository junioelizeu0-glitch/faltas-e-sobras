import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Loader2, Save, X } from "lucide-react";

type ServerFn = (args?: any) => Promise<any>;

type Props = {
  titulo: string;
  descricao?: string;
  listFn: ServerFn;
  upsertFn: ServerFn;
  deleteFn: ServerFn;
};

export default function CadastroSimples({ titulo, descricao, listFn, upsertFn, deleteFn }: Props) {
  const list = useServerFn(listFn as any);
  const up = useServerFn(upsertFn as any);
  const del = useServerFn(deleteFn as any);
  const [rows, setRows] = useState<Array<{ id: string; nome: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ id?: string; nome: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setRows(await list() as any); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    setErr(null);
    try {
      await up({ data: { id: editing.id, nome: editing.nome.trim() } });
      setEditing(null); await load();
    } catch (e: any) { setErr(e?.message || "Erro"); }
  };

  const remove = async (id: string) => {
    if (!confirm("Remover este registro?")) return;
    try { await del({ data: { id } }); await load(); } catch (e: any) { alert(e?.message || "Erro"); }
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{titulo}</h1>
            {descricao && <p className="text-sm text-slate-500 mt-1">{descricao}</p>}
          </div>
          <button onClick={() => setEditing({ nome: "" })} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md">
            <Plus className="w-4 h-4"/>Novo
          </button>
        </header>
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          {loading ? <div className="p-8 text-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline mr-2"/>Carregando...</div> : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <tr><th className="text-left px-3 py-2 font-semibold">Nome</th><th className="text-right px-3 py-2 font-semibold">Ações</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2">{r.nome}</td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <button onClick={() => setEditing(r)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold">Editar</button>
                      <button onClick={() => remove(r.id)} className="text-red-500 hover:text-red-700 text-xs font-semibold">Excluir</button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={2} className="px-3 py-6 text-center text-slate-400">Nenhum registro.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold">{editing.id ? "Editar" : "Novo"} registro</h3>
              <button onClick={() => setEditing(null)}><X className="w-5 h-5 text-slate-400"/></button>
            </div>
            <div className="p-4 space-y-3">
              {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{err}</div>}
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Nome</span>
                <input autoFocus value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} className="mt-1 w-full text-sm rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </label>
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
