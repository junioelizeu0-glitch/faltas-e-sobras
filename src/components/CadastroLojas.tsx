import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Loader2, Save, X, Search, Pencil, Trash2, Lock, Download } from "lucide-react";
import Pagination from "./Pagination";
import { listLojas, upsertLoja, deleteLoja, type Loja } from "@/lib/lojas.functions";

const PAGE_SIZE = 30;
const EMPTY: Loja = {
  id: "", numero: "", cnpj: "", razao_social: "", tipo: "", banco: "", agencia: "", agencia_dig: "",
  conta: "", conta_dig: "", observacao: "",
};

export default function CadastroLojas({ buscaInicial }: { buscaInicial?: string } = {}) {
  const list = useServerFn(listLojas);
  const up = useServerFn(upsertLoja);
  const del = useServerFn(deleteLoja);
  const [rows, setRows] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState(buscaInicial || "");
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

  const onlyDigits = (v: string) => String(v || "").replace(/\D/g, "");
  const titleCase = (v: string) =>
    String(v || "")
      .toLowerCase()
      .replace(/(^|\s|\/|-)([\p{L}])/gu, (_, sep, ch) => sep + ch.toUpperCase());

  const buscarCnpj = async (cnpjOverride?: string) => {
    if (!editing) return;
    const digits = onlyDigits(cnpjOverride ?? editing.cnpj ?? "");
    if (digits.length !== 14) { toast.error("Informe um CNPJ com 14 dígitos."); return; }
    setLookupCnpj(true);
    try {
      const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!resp.ok) throw new Error("CNPJ não encontrado.");
      const j: any = await resp.json();
      setEditing((prev) => prev ? ({
        ...prev,
        cnpj: formatCnpj(digits),
        razao_social: j.razao_social || j.nome_fantasia || prev.razao_social || "",
      }) : prev);
      toast.success("Razão social preenchida");
    } catch (e: any) {
      toast.error(e?.message || "CNPJ não consultado");
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
      toast.success("Loja salva");
      setEditing(null); await load();
    } catch (e: any) { setErr(e?.message || "Erro"); toast.error(e?.message || "Erro ao salvar loja"); }
    finally { setSaving(false); }
  };

  const remove = async (r: Loja) => {
    if (!confirm(`Remover loja "${r.numero}"?`)) return;
    try { await del({ data: { id: r.id } }); toast.success("Loja removida"); await load(); }
    catch (e: any) { toast.error(e?.message || "Erro ao remover loja"); }
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
        className="mt-1.5 w-full text-sm rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white font-medium"
      />
    </label>
  );

  return (
    <div className="flex-1 min-h-screen bg-[#F4F6F5] p-4 md:p-6 space-y-6 text-slate-800 font-sans">
      <div className="w-full bg-white rounded-2xl border border-slate-200/70 shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-6 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Cadastro de Lojas</h1>
            <p className="text-xs text-slate-500 mt-1">Dados bancários e cadastrais corporativos. Total: {filtered.length.toLocaleString("pt-BR")} lojas</p>
          </div>
          <button
            onClick={() => { setErr(null); setEditing({ ...EMPTY }); }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl cursor-pointer shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4"/>
            <span>Nova Loja</span>
          </button>
        </header>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por número, CNPJ, razão social ou banco..."
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
          />
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <Loader2 className="inline w-6 h-6 animate-spin mr-2 text-emerald-600"/>
              <span>Carregando lojas...</span>
            </div>
          ) : (
            <table className="min-w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Número</th>
                  <th className="px-4 py-3">Razão Social</th>
                  <th className="px-4 py-3">CNPJ</th>
                  <th className="px-4 py-3">Banco</th>
                  <th className="px-4 py-3">Ag / Conta</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginated.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors cursor-pointer" onClick={() => setViewing(r)}>
                    <td className="px-4 py-3 font-bold text-slate-900">{r.numero}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{r.razao_social || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{r.cnpj || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{r.banco || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono">
                      {r.agencia ? `${r.agencia}${r.agencia_dig ? "-" + r.agencia_dig : ""}` : "—"}
                      {" / "}
                      {r.conta ? `${r.conta}${r.conta_dig ? "-" + r.conta_dig : ""}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
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
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Nenhuma loja cadastrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <Pagination page={page} totalPages={totalPages} onChange={setPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />
      </div>

      {/* Modal de visualização somente-leitura */}
      {viewing && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-auto border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-400"/>
                <span>Loja {viewing.numero} — dados bancários</span>
              </h3>
              <button onClick={() => setViewing(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5"/>
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 text-xs">
              {[
                ["Razão Social", viewing.razao_social],
                ["CNPJ", viewing.cnpj],
                ["Tipo", viewing.tipo],
                ["Banco", viewing.banco],
                ["Agência", viewing.agencia ? `${viewing.agencia}${viewing.agencia_dig ? "-" + viewing.agencia_dig : ""}` : null],
                ["Conta", viewing.conta ? `${viewing.conta}${viewing.conta_dig ? "-" + viewing.conta_dig : ""}` : null],
                ["Observação", viewing.observacao],
              ].map(([label, val]) => (
                <div key={label as string}>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</div>
                  <div className="mt-1 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-slate-800 font-medium min-h-[38px]">
                    {val || "—"}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button onClick={() => { setEditing(viewing); setViewing(null); }} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl cursor-pointer border border-emerald-200/60">
                <Pencil className="w-3.5 h-3.5"/> Editar
              </button>
              <button onClick={() => setViewing(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edição/criação com Alinhamento Perfeito da Conta e Dígito */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-auto border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900">{editing.id ? "Editar" : "Nova"} loja</h3>
              <button onClick={() => setEditing(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5"/>
              </button>
            </div>
            <div className="p-6 space-y-5">
              {err && <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3 font-semibold">{err}</div>}
              
              <div className="flex flex-wrap items-end gap-4">
                <div className="w-36 shrink-0">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Número da Loja *</span>
                    <input
                      inputMode="numeric"
                      value={editing?.numero ?? ""}
                      onChange={(e) => setEditing({ ...(editing as Loja), numero: onlyDigits(e.target.value) })}
                      placeholder="Ex.: 101"
                      className="mt-1.5 w-full text-sm rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white font-medium"
                    />
                  </label>
                </div>
                <label className="flex-1 min-w-0 block">
                  <span className="text-xs font-semibold text-slate-600">CNPJ</span>
                  <div className="mt-1.5 flex gap-2">
                    <input
                      value={editing?.cnpj ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const digits = onlyDigits(raw);
                        setEditing({ ...(editing as Loja), cnpj: formatCnpj(raw) });
                        if (digits.length === 14) buscarCnpj(digits);
                      }}
                      onPaste={(e) => {
                        const text = e.clipboardData.getData("text");
                        const digits = onlyDigits(text);
                        if (digits.length === 14) {
                          e.preventDefault();
                          setEditing({ ...(editing as Loja), cnpj: formatCnpj(digits) });
                          buscarCnpj(digits);
                        }
                      }}
                      placeholder="00.000.000/0001-00"
                      className="flex-1 text-sm rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => buscarCnpj()}
                      disabled={lookupCnpj}
                      title="Buscar dados na Receita"
                      className="inline-flex items-center gap-1.5 px-4 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {lookupCnpj ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4"/>}
                      <span>Buscar</span>
                    </button>
                  </div>
                </label>
              </div>

              {field("Razão Social", "razao_social")}

              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dados Bancários</div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Tipo *</span>
                    <select
                      value={editing?.tipo ?? ""}
                      onChange={(e) => setEditing({ ...(editing as Loja), tipo: e.target.value })}
                      className="mt-1.5 w-full text-sm rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white font-medium cursor-pointer"
                    >
                      <option value="">Selecione...</option>
                      <option value="Própria">Própria</option>
                      <option value="Franquia">Franquia</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Banco</span>
                    <input
                      value={editing?.banco ?? ""}
                      onChange={(e) => setEditing({ ...(editing as Loja), banco: titleCase(e.target.value) })}
                      className="mt-1.5 w-full text-sm rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white font-medium"
                    />
                  </label>
                </div>

                {/* GRADE PERFEITAMENTE ALINHADA DA AGÊNCIA, DÍGITO AG., CONTA E DÍGITO CTA */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Agência</span>
                    <input
                      inputMode="numeric"
                      value={editing?.agencia ?? ""}
                      onChange={(e) => setEditing({ ...(editing as Loja), agencia: onlyDigits(e.target.value) })}
                      className="mt-1.5 w-full text-sm rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white font-medium"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Dígito Ag.</span>
                    <input
                      inputMode="numeric"
                      value={editing?.agencia_dig ?? ""}
                      onChange={(e) => setEditing({ ...(editing as Loja), agencia_dig: onlyDigits(e.target.value).slice(0, 2) })}
                      className="mt-1.5 w-full text-sm rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white font-medium"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Conta</span>
                    <input
                      value={editing?.conta ?? ""}
                      onChange={(e) => setEditing({ ...(editing as Loja), conta: e.target.value })}
                      className="mt-1.5 w-full text-sm rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white font-medium"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Dígito Cta.</span>
                    <input
                      value={editing?.conta_dig ?? ""}
                      onChange={(e) => setEditing({ ...(editing as Loja), conta_dig: e.target.value })}
                      className="mt-1.5 w-full text-sm rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white font-medium"
                    />
                  </label>
                </div>
              </div>

              {field("Observação", "observacao")}
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
