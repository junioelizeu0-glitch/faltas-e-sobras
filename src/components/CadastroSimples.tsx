import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Loader2, Save, X, Search, Pencil, Trash2 } from "lucide-react";

type ServerFn = (args?: any) => Promise<any>;

export type ExtraField = {
  key: string;
  label: string;
  type: "select" | "text";
  options?: string[];
  required?: boolean;
};

type Row = { id: string; nome: string; [k: string]: any };

type Props = {
  titulo: string;
  descricao?: string;
  listFn: ServerFn;
  upsertFn: ServerFn;
  deleteFn: ServerFn;
  extraFields?: ExtraField[];
};

export default function CadastroSimples({ titulo, descricao, listFn, upsertFn, deleteFn, extraFields = [] }: Props) {
  const list = useServerFn(listFn as any);
  const up = useServerFn(upsertFn as any);
  const del = useServerFn(deleteFn as any);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setRows(await list() as any); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.nome, ...extraFields.map((f) => r[f.key])].some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }, [rows, busca, extraFields]);

  const openNew = () => setEditing({ id: "", nome: "" } as Row);

  const save = async () => {
    if (!editing) return;
    setErr(null); setSaving(true);
    try {
      const payload: any = { id: editing.id || undefined, nome: editing.nome.trim() };
      for (const f of extraFields) payload[f.key] = (editing as any)[f.key] ?? null;
      await up({ data: payload });
      toast.success("Registro salvo com sucesso.");
      setEditing(null); await load();
    } catch (e: any) { setErr(e?.message || "Erro"); toast.error(e?.message || "Erro"); }
    finally { setSaving(false); }
  };

  const remove = async (r: Row) => {
    if (!confirm(`Remover "${r.nome}"?`)) return;
    try { await del({ data: { id: r.id } }); toast.success("Removido."); await load(); }
    catch (e: any) { toast.error(e?.message || "Erro"); }
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-4">
      <div className="w-full">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{titulo}</h1>
            {descricao && <p className="text-sm text-slate-500 mt-1">{descricao}</p>}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar..." className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 w-56" />
            </div>
            <button onClick={openNew} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md cursor-pointer">
              <Plus className="w-4 h-4"/>Novo
            </button>
          </div>
        </header>

        {loading ? (
          <div className="p-10 text-center text-slate-500 bg-white rounded-lg border">
            <Loader2 className="w-5 h-5 animate-spin inline mr-2"/>Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400 bg-white rounded-lg border">Nenhum registro.</div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-3 py-2 text-xs text-slate-500 border-b bg-slate-50">
              {filtered.length} {filtered.length === 1 ? "registro" : "registros"}
            </div>
            <ul className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <li key={r.id} className="group flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors">
                  <div className="min-w-0 flex-1 flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium text-slate-800 truncate" title={r.nome}>{r.nome}</span>
                    {extraFields.map((f) => (
                      r[f.key] ? (
                        <span key={f.key} className="text-[11px] text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">
                          {f.label}: <span className="font-medium text-slate-700">{String(r[f.key])}</span>
                        </span>
                      ) : null
                    ))}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditing(r)} title="Editar" className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-3.5 h-3.5"/></button>
                    <button onClick={() => remove(r)} title="Excluir" className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5"/></button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
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
                <span className="text-xs font-semibold text-slate-600">Nome *</span>
                <input autoFocus value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} className="mt-1 w-full text-sm rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </label>
              {extraFields.map((f) => (
                <label key={f.key} className="block">
                  <span className="text-xs font-semibold text-slate-600">{f.label}{f.required ? " *" : ""}</span>
                  {f.type === "select" ? (
                    <select value={(editing as any)[f.key] || ""} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value } as Row)} className="mt-1 w-full text-sm rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="">— Selecionar —</option>
                      {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input value={(editing as any)[f.key] || ""} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value } as Row)} className="mt-1 w-full text-sm rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  )}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t bg-slate-50">
              <button onClick={() => setEditing(null)} className="px-3 py-2 text-sm text-slate-600">Cancelar</button>
              <button onClick={save} disabled={saving} className="inline-flex items-center gap-1 px-3 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
