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
    <div className="flex-1 min-h-screen bg-[#F4F6F5] p-4 md:p-6 space-y-6 text-slate-800 font-sans">
      <div className="w-full bg-white rounded-2xl border border-slate-200/70 shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-6 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{titulo}</h1>
            {descricao && <p className="text-xs text-slate-500 mt-1">{descricao}</p>}
            <p className="text-xs text-slate-500 mt-1">Total: {filtered.length.toLocaleString("pt-BR")} registros</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openNew}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl cursor-pointer shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4"/>
              <span>Novo Registro</span>
            </button>
          </div>
        </header>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar..."
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
          />
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <Loader2 className="inline w-6 h-6 animate-spin mr-2 text-emerald-600"/>
              <span>Carregando dados...</span>
            </div>
          ) : (
            <table className="min-w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 w-[260px]">{nomeLabel}</th>
                  {extraFields.map((f) => (
                    <th key={f.key} className="px-4 py-3 w-[120px]">{f.label}</th>
                  ))}
                  <th className="px-4 py-3 text-right w-[100px]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginated.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 truncate max-w-[260px]" title={r.nome}>{r.nome}</td>
                    {extraFields.map((f) => (
                      <td key={f.key} className="px-4 py-3 text-slate-600 font-medium truncate max-w-[120px]" title={String(r[f.key] ?? "")}>{r[f.key] || "—"}</td>
                    ))}
                    <td className="px-4 py-3 text-right space-x-1 w-[100px]">
                      <button onClick={() => setEditing(r)} title="Editar" className="inline-flex items-center p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer">
                        <Pencil className="w-3.5 h-3.5"/>
                      </button>
                      <button onClick={() => remove(r)} title="Excluir" className="inline-flex items-center p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={2 + extraFields.length} className="px-4 py-8 text-center text-slate-400">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <Pagination page={page} totalPages={totalPages} onChange={setPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900">{editing.id ? "Editar" : "Novo"} registro</h3>
              <button onClick={() => setEditing(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5"/>
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              {err && <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3 font-semibold">{err}</div>}
              <label className="block">
                <span className="font-semibold text-slate-600">{nomeLabel} *</span>
                <input autoFocus value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} className="mt-1.5 w-full text-sm rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white font-medium"/>
              </label>
              {extraFields.map((f) => (
                <label key={f.key} className="block">
                  <span className="font-semibold text-slate-600">{f.label}{f.required ? " *" : ""}</span>
                  {f.type === "select" ? (
                    <select value={(editing as any)[f.key] || ""} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value } as Row)} className="mt-1.5 w-full text-sm rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white font-medium cursor-pointer">
                      <option value="">— Selecionar —</option>
                      {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input value={(editing as any)[f.key] || ""} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value } as Row)} className="mt-1.5 w-full text-sm rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white font-medium"/>
                  )}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">
                Cancelar
              </button>
              <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl disabled:opacity-50 transition-colors cursor-pointer shadow-xs">
                {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                <span>Salvar</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
