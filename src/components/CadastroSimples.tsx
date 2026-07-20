import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Loader2, Save, X, Search, Pencil, Trash2 } from "lucide-react";
import Pagination from "./Pagination";

const PAGE_SIZE = 30;

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
  nomeLabel?: string;
};

export default function CadastroSimples({ titulo, descricao, listFn, upsertFn, deleteFn, extraFields = [], nomeLabel = "Nome" }: Props) {
  const list = useServerFn(listFn as any);
  const up = useServerFn(upsertFn as any);
  const del = useServerFn(deleteFn as any);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);

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

  useEffect(() => { setPage(0); }, [busca, rows.length]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page]);

  const openNew = () => setEditing({ id: "", nome: "" } as Row);

  const save = async () => {
    if (!editing) return;
    setErr(null); setSaving(true);
    try {
      const payload: any = { id: editing.id || undefined, nome: editing.nome.trim() };
      for (const f of extraFields) payload[f.key] = (editing as any)[f.key] ?? null;
      await up({ data: payload });
      toast.success("Registro salvo");
      setEditing(null); await load();
    } catch (e: any) { setErr(e?.message || "Erro"); toast.error(e?.message || "Erro ao salvar"); }
    finally { setSaving(false); }
  };

  const remove = async (r: Row) => {
    if (!confirm(`Remover "${r.nome}"?`)) return;
    try { await del({ data: { id: r.id } }); toast.success("Registro removido"); await load(); }
    catch (e: any) { toast.error(e?.message || "Erro ao remover"); }
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-4">
      <div className="w-full">
        <header className="sticky top-0 z-10 -mx-4 -mt-4 px-4 pt-4 pb-3 mb-4 bg-slate-50/95 backdrop-blur border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{titulo}</h1>
            {descricao && <p className="text-sm text-slate-500 mt-1">{descricao}</p>}
            <p className="text-sm text-slate-500 mt-1">Total: {filtered.length.toLocaleString("pt-BR")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openNew} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md cursor-pointer">
              <Plus className="w-4 h-4"/>Novo
            </button>
          </div>
        </header>

        <div className="mb-3 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar..." className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"/>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          {loading ? <div className="p-8 text-center"><Loader2 className="inline w-5 h-5 animate-spin mr-2"/>Carregando...</div> : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b text-xs uppercase text-slate-500">
                <tr>
                  <th className="text-left px-3 py-2 w-[260px]">{nomeLabel}</th>
                  {extraFields.map((f) => (
                    <th key={f.key} className="text-left px-3 py-2 w-[100px]">{f.label}</th>
                  ))}
                  <th className="text-right px-3 py-2 w-[100px]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-800 w-[260px] max-w-[260px] truncate" title={r.nome}>{r.nome}</td>
                    {extraFields.map((f) => (
                      <td key={f.key} className="px-3 py-2 text-slate-600 w-[100px] max-w-[100px] truncate" title={String(r[f.key] ?? "")}>{r[f.key] || "—"}</td>
                    ))}
                    <td className="px-3 py-2 text-right space-x-2 w-[100px]">
                      <button onClick={() => setEditing(r)} title="Editar" className="inline-flex items-center p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-3.5 h-3.5"/></button>
                      <button onClick={() => remove(r)} title="Excluir" className="inline-flex items-center p-1.5 text-red-500 hover:bg-red-50 rounded ml-0.5"><Trash2 className="w-3.5 h-3.5"/></button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={2 + extraFields.length} className="px-3 py-6 text-center text-slate-400">Nenhum registro.</td></tr>}
              </tbody>
            </table>
          )}
        </div>

        <Pagination page={page} totalPages={totalPages} onChange={setPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold">{editing.id ? "Editar" : "Novo"} registro</h3>
              <button><X className="w-5 h-5 text-slate-400"/></button>
            </div>
            <div className="p-4 space-y-3">
              {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{err}</div>}
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">{nomeLabel} *</span>
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
