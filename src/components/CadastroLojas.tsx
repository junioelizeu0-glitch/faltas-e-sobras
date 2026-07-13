import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Loader2, Save, X, Search, Pencil, Trash2, Lock, Download } from "lucide-react";
import Pagination from "./Pagination";
import { listLojas, upsertLoja, deleteLoja, type Loja } from "@/lib/lojas.functions";

const PAGE_SIZE = 30;
const EMPTY: Loja = {
  id: "", numero: "", cnpj: "", razao_social: "", banco: "", agencia: "", agencia_dig: "",
  conta: "", conta_dig: "", tipo_conta: "", pix: "", observacao: "",
};

export default function CadastroLojas() {
  const list = useServerFn(listLojas);
  const up = useServerFn(upsertLoja);
  const del = useServerFn(deleteLoja);
  const [rows, setRows] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [editing, setEditing] = useState<Loja | null>(null);
  const [viewing, setViewing] = useState<Loja | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [lookupCnpj, setLookupCnpj] = useState(false);

  const formatCnpj = (v: string) => {
    const d = String(v || "").replace(/\D/g, "").slice(0, 14);
    return d
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  const buscarCnpj = async () => {
    if (!editing) return;
    const digits = String(editing.cnpj || "").replace(/\D/g, "");
    if (digits.length !== 14) { toast.error("Informe um CNPJ com 14 dígitos."); return; }
    setLookupCnpj(true);
    try {
      const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!resp.ok) throw new Error("CNPJ não encontrado.");
      const j: any = await resp.json();
      setEditing({
        ...editing,
        cnpj: formatCnpj(digits),
        razao_social: editing.razao_social?.trim() ? editing.razao_social : (j.razao_social || j.nome_fantasia || ""),
      });
      toast.success("Razão social preenchida pela Receita.");
    } catch (e: any) {
      toast.error(e?.message || "Falha ao consultar CNPJ.");
    } finally {
      setLookupCnpj(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try { setRows(await list() as any); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.numero, r.cnpj, r.razao_social, r.banco].some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }, [rows, busca]);

  useEffect(() => { setPage(0); }, [busca, rows.length]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page]);

  const save = async () => {
    if (!editing) return;
    setErr(null); setSaving(true);
    try {
      await up({ data: editing as any });
      toast.success("Loja salva com sucesso.");
      setEditing(null); await load();
    } catch (e: any) { setErr(e?.message || "Erro"); toast.error(e?.message || "Erro"); }
    finally { setSaving(false); }
  };

  const remove = async (r: Loja) => {
    if (!confirm(`Remover loja "${r.numero}"?`)) return;
    try { await del({ data: { id: r.id } }); toast.success("Removida."); await load(); }
    catch (e: any) { toast.error(e?.message || "Erro"); }
  };

  const field = (label: string, key: keyof Loja, opts?: { readOnly?: boolean; placeholder?: string; className?: string }) => (
    <label className={`block ${opts?.className || ""}`}>
      <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
        {label}{opts?.readOnly && <Lock className="w-3 h-3 text-slate-400" />}
      </span>
      <input
        value={(editing as any)?.[key] ?? ""}
        onChange={(e) => setEditing({ ...(editing as Loja), [key]: e.target.value })}
        placeholder={opts?.placeholder}
        className="mt-1 w-full text-sm rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-4">
      <div className="w-full">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Cadastro de Lojas</h1>
            <p className="text-sm text-slate-500 mt-1">Dados bancários e cadastrais para geração de relatórios. Total: {filtered.length.toLocaleString("pt-BR")}</p>
          </div>
          <button onClick={() => { setErr(null); setEditing({ ...EMPTY }); }} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md cursor-pointer">
            <Plus className="w-4 h-4"/>Nova Loja
          </button>
        </header>

        <div className="mb-3 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por número, CNPJ, razão social ou banco..." className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"/>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          {loading ? <div className="p-8 text-center"><Loader2 className="inline w-5 h-5 animate-spin mr-2"/>Carregando...</div> : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b text-xs uppercase text-slate-500">
                <tr>
                  <th className="text-left px-3 py-2">Número</th>
                  <th className="text-left px-3 py-2">Razão Social</th>
                  <th className="text-left px-3 py-2">CNPJ</th>
                  <th className="text-left px-3 py-2">Banco</th>
                  <th className="text-left px-3 py-2">Ag / Conta</th>
                  <th className="text-right px-3 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setViewing(r)}>
                    <td className="px-3 py-2 font-semibold text-slate-800">{r.numero}</td>
                    <td className="px-3 py-2 text-slate-700">{r.razao_social || "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{r.cnpj || "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{r.banco || "—"}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {r.agencia ? `${r.agencia}${r.agencia_dig ? "-" + r.agencia_dig : ""}` : "—"}
                      {" / "}
                      {r.conta ? `${r.conta}${r.conta_dig ? "-" + r.conta_dig : ""}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setEditing(r)} title="Editar" className="inline-flex items-center p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-3.5 h-3.5"/></button>
                      <button onClick={() => remove(r)} title="Excluir" className="inline-flex items-center p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5"/></button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">Nenhuma loja cadastrada.</td></tr>}
              </tbody>
            </table>
          )}
        </div>

        <Pagination page={page} totalPages={totalPages} onChange={setPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />
      </div>

      {/* Modal de visualização somente-leitura */}
      {viewing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold flex items-center gap-2"><Lock className="w-4 h-4 text-slate-400"/> Loja {viewing.numero} — dados bancários (somente leitura)</h3>
              <button onClick={() => setViewing(null)}><X className="w-5 h-5 text-slate-400"/></button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3 text-sm">
              {[
                ["Razão Social", viewing.razao_social],
                ["CNPJ", viewing.cnpj],
                ["Banco", viewing.banco],
                ["Tipo de Conta", viewing.tipo_conta],
                ["Agência", viewing.agencia ? `${viewing.agencia}${viewing.agencia_dig ? "-" + viewing.agencia_dig : ""}` : null],
                ["Conta", viewing.conta ? `${viewing.conta}${viewing.conta_dig ? "-" + viewing.conta_dig : ""}` : null],
                ["PIX", viewing.pix],
                ["Observação", viewing.observacao],
              ].map(([label, val]) => (
                <div key={label as string}>
                  <div className="text-xs font-semibold text-slate-500 uppercase">{label}</div>
                  <div className="mt-1 rounded-md bg-slate-50 border border-slate-200 px-3 py-2 text-slate-700 min-h-[38px]">{val || "—"}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t bg-slate-50">
              <button onClick={() => { setEditing(viewing); setViewing(null); }} className="inline-flex items-center gap-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md"><Pencil className="w-4 h-4"/> Editar</button>
              <button onClick={() => setViewing(null)} className="px-3 py-2 text-sm text-slate-600">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edição/criação */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold">{editing.id ? "Editar" : "Nova"} loja</h3>
              <button onClick={() => setEditing(null)}><X className="w-5 h-5 text-slate-400"/></button>
            </div>
            <div className="p-4 space-y-3">
              {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{err}</div>}
              <div className="grid grid-cols-2 gap-3">
                {field("Número da Loja *", "numero", { placeholder: "Ex.: 101" })}
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">CNPJ</span>
                  <div className="mt-1 flex gap-1">
                    <input
                      value={editing?.cnpj ?? ""}
                      onChange={(e) => setEditing({ ...(editing as Loja), cnpj: formatCnpj(e.target.value) })}
                      onBlur={() => { if (String(editing?.cnpj || "").replace(/\D/g, "").length === 14 && !editing?.razao_social) buscarCnpj(); }}
                      placeholder="00.000.000/0001-00"
                      className="flex-1 text-sm rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button type="button" onClick={buscarCnpj} disabled={lookupCnpj} title="Buscar dados na Receita" className="inline-flex items-center gap-1 px-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-md disabled:opacity-50">
                      {lookupCnpj ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4"/>}
                    </button>
                  </div>
                </label>
              </div>
              {field("Razão Social", "razao_social")}
              <div className="pt-2 border-t">
                <div className="text-xs font-bold text-slate-500 uppercase mb-2">Dados Bancários</div>
                <div className="grid grid-cols-3 gap-3">
                  {field("Banco", "banco")}
                  {field("Tipo de Conta", "tipo_conta", { placeholder: "Corrente / Poupança" })}
                  {field("PIX", "pix")}
                </div>
                <div className="grid grid-cols-4 gap-3 mt-3">
                  {field("Agência", "agencia")}
                  {field("Dígito Ag.", "agencia_dig")}
                  {field("Conta", "conta")}
                  {field("Dígito Cta.", "conta_dig")}
                </div>
              </div>
              {field("Observação", "observacao")}
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
