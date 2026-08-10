import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Loader2, Save, X, Search, Pencil, Trash2, Lock, Download, FileText, Store } from "lucide-react";
import Pagination from "./Pagination";
import { listLojas, upsertLoja, deleteLoja, listChamadosPorLoja, type Loja } from "@/lib/lojas.functions";

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
  const [modalTab, setModalTab] = useState<"dados" | "chamados">("dados");
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
        className="mt-1 w-full text-xs rounded-md border border-slate-300 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </label>
  );

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-4">
      <div className="w-full">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Cadastro de Lojas</h1>
            <p className="text-xs text-slate-500 mt-0.5">Dados bancários e cadastrais para geração de relatórios. Total: {filtered.length.toLocaleString("pt-BR")}</p>
          </div>
          <button onClick={() => { setErr(null); setModalTab("dados"); setEditing({ ...EMPTY }); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md cursor-pointer">
            <Plus className="w-3.5 h-3.5"/>Nova Loja
          </button>
        </header>

        <div className="mb-3 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por número, CNPJ, razão social ou banco..." className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"/>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          {loading ? <div className="p-8 text-center text-xs"><Loader2 className="inline w-4 h-4 animate-spin mr-2"/>Carregando...</div> : (
            <table className="min-w-full text-xs">
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
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => { setModalTab("dados"); setViewing(r); }}>
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
                      <button onClick={() => { setModalTab("dados"); setEditing(r); }} title="Editar" className="inline-flex items-center p-1 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-3.5 h-3.5"/></button>
                      <button onClick={() => remove(r)} title="Excluir" className="inline-flex items-center p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5"/></button>
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
                <Store className="w-4 h-4 text-blue-600"/> Loja {viewing.numero} — Detalhes
              </h3>
              <button onClick={() => setViewing(null)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600"/></button>
            </div>

            {/* Abas */}
            <div className="flex border-b border-slate-200 bg-white px-4">
              <button
                onClick={() => setModalTab("dados")}
                className={`px-4 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${modalTab === "dados" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
              >
                <Store className="w-3.5 h-3.5"/> Dados da Loja
              </button>
              <button
                onClick={() => setModalTab("chamados")}
                className={`px-4 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${modalTab === "chamados" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
              >
                <FileText className="w-3.5 h-3.5"/> Chamados Vinculados
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto">
              {modalTab === "dados" && (
                <div className="grid grid-cols-2 gap-3 text-xs">
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
                      <div className="text-[10px] font-semibold text-slate-500 uppercase">{label}</div>
                      <div className="mt-1 rounded-md bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-slate-700 min-h-[32px] flex items-center">{val || "—"}</div>
                    </div>
                  ))}
                </div>
              )}

              {modalTab === "chamados" && (
                <ChamadosLojaTab lojaNumero={viewing.numero} />
              )}
            </div>

            <div className="flex justify-end gap-2 px-4 py-2.5 border-t bg-slate-50">
              <button onClick={() => { setEditing(viewing); setViewing(null); setModalTab("dados"); }} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md font-medium">
                <Pencil className="w-3.5 h-3.5"/> Editar Loja
              </button>
              <button onClick={() => setViewing(null)} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-md">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edição/criação */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b bg-slate-50">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <Store className="w-4 h-4 text-blue-600"/>
                {editing.id ? `Editar Loja nº ${editing.numero}` : "Nova Loja"}
              </h3>
              <button onClick={() => setEditing(null)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600"/></button>
            </div>

            {/* Abas na edição */}
            {editing.id && (
              <div className="flex border-b border-slate-200 bg-white px-4">
                <button
                  onClick={() => setModalTab("dados")}
                  className={`px-4 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${modalTab === "dados" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                >
                  <Store className="w-3.5 h-3.5"/> Dados da Loja
                </button>
                <button
                  onClick={() => setModalTab("chamados")}
                  className={`px-4 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${modalTab === "chamados" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                >
                  <FileText className="w-3.5 h-3.5"/> Chamados Vinculados
                </button>
              </div>
            )}

            <div className="p-6 flex-1 overflow-auto">
              {modalTab === "dados" ? (
                <div className="space-y-5">
                  {err && <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{err}</div>}
                  
                  {/* Linha 1: Número, CNPJ, Razão Social */}
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-3">
                      <label className="block">
                        <span className="text-xs font-bold text-slate-700">Número da Loja *</span>
                        <input
                          inputMode="numeric"
                          value={editing?.numero ?? ""}
                          onChange={(e) => setEditing({ ...(editing as Loja), numero: onlyDigits(e.target.value) })}
                          placeholder="Ex.: 101"
                          className="mt-1.5 w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </label>
                    </div>
                    <div className="col-span-4">
                      <label className="block">
                        <span className="text-xs font-bold text-slate-700">CNPJ</span>
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
                            className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          />
                          <button type="button" onClick={() => buscarCnpj()} disabled={lookupCnpj} title="Buscar dados na Receita" className="inline-flex items-center justify-center px-3 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50 shrink-0 cursor-pointer">
                            {lookupCnpj ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4"/>}
                          </button>
                        </div>
                      </label>
                    </div>
                    <div className="col-span-5">
                      <label className="block">
                        <span className="text-xs font-bold text-slate-700">Razão Social</span>
                        <input
                          value={editing?.razao_social ?? ""}
                          onChange={(e) => setEditing({ ...(editing as Loja), razao_social: e.target.value })}
                          placeholder="Nome da razão social da loja"
                          className="mt-1.5 w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Dados Bancários */}
                  <div className="pt-4 border-t border-slate-100">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Dados Bancários
                    </div>

                    <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-4">
                        <label className="block">
                          <span className="text-xs font-bold text-slate-700">Tipo *</span>
                          <select
                            value={editing?.tipo ?? ""}
                            onChange={(e) => setEditing({ ...(editing as Loja), tipo: e.target.value })}
                            className="mt-1.5 w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                          >
                            <option value="">Selecione...</option>
                            <option value="Própria">Própria</option>
                            <option value="Franquia">Franquia</option>
                          </select>
                        </label>
                      </div>
                      <div className="col-span-8">
                        <label className="block">
                          <span className="text-xs font-bold text-slate-700">Banco</span>
                          <input
                            value={editing?.banco ?? ""}
                            onChange={(e) => setEditing({ ...(editing as Loja), banco: titleCase(e.target.value) })}
                            placeholder="Nome do banco (ex: Bradesco, Itaú)"
                            className="mt-1.5 w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Proporções perfeitas: Agencia (3 cols), Dig (2 cols), Conta (5 cols), Dig (2 cols) */}
                    <div className="grid grid-cols-12 gap-4 mt-4">
                      <div className="col-span-3">
                        <label className="block">
                          <span className="text-xs font-bold text-slate-700">Agência</span>
                          <input
                            inputMode="numeric"
                            value={editing?.agencia ?? ""}
                            onChange={(e) => setEditing({ ...(editing as Loja), agencia: onlyDigits(e.target.value) })}
                            placeholder="Ex.: 0513"
                            className="mt-1.5 w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          />
                        </label>
                      </div>
                      <div className="col-span-2">
                        <label className="block">
                          <span className="text-xs font-bold text-slate-700">Díg. Ag.</span>
                          <input
                            inputMode="numeric"
                            value={editing?.agencia_dig ?? ""}
                            onChange={(e) => setEditing({ ...(editing as Loja), agencia_dig: onlyDigits(e.target.value).slice(0, 2) })}
                            placeholder="Ex.: 0"
                            className="mt-1.5 w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-center font-mono"
                          />
                        </label>
                      </div>
                      <div className="col-span-5">
                        <label className="block">
                          <span className="text-xs font-bold text-slate-700">Conta Corrente</span>
                          <input
                            inputMode="numeric"
                            value={editing?.conta ?? ""}
                            onChange={(e) => setEditing({ ...(editing as Loja), conta: onlyDigits(e.target.value) })}
                            placeholder="Ex.: 0435574"
                            className="mt-1.5 w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                          />
                        </label>
                      </div>
                      <div className="col-span-2">
                        <label className="block">
                          <span className="text-xs font-bold text-slate-700">Díg. Cta.</span>
                          <input
                            inputMode="numeric"
                            value={editing?.conta_dig ?? ""}
                            onChange={(e) => setEditing({ ...(editing as Loja), conta_dig: onlyDigits(e.target.value).slice(0, 2) })}
                            placeholder="Ex.: 1"
                            className="mt-1.5 w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-center font-mono"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Observação */}
                  <div className="pt-2">
                    <label className="block">
                      <span className="text-xs font-bold text-slate-700">Observações</span>
                      <textarea
                        rows={2}
                        value={editing?.observacao ?? ""}
                        onChange={(e) => setEditing({ ...(editing as Loja), observacao: e.target.value })}
                        placeholder="Observações bancárias ou administrativas sobre esta loja..."
                        className="mt-1.5 w-full text-xs rounded-xl border border-slate-200 bg-white p-3 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <ChamadosLojaTab lojaNumero={editing.numero} />
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-3.5 border-t border-slate-100 bg-slate-50/60">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer">Cancelar</button>
              <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer">
                {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}Salvar Loja
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function ChamadosLojaTab({ lojaNumero }: { lojaNumero: string }) {
  const getChamadosFn = useServerFn(listChamadosPorLoja);
  const [chamados, setChamados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lojaNumero) { setChamados([]); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await getChamadosFn({ data: { lojaNumero } });
        if (!cancelled) setChamados(data || []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Erro ao carregar chamados da loja");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [lojaNumero]);

  const totalValor = useMemo(() => {
    return chamados.reduce((acc, c) => acc + (Number(c.valor) || 0), 0);
  }, [chamados]);

  if (loading) return <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-emerald-600"/>Carregando chamados da loja {lojaNumero}...</div>;
  if (error) return <div className="p-4 text-xs font-semibold text-rose-700 bg-rose-50 rounded-xl border border-rose-200/60">{error}</div>;
  if (!chamados.length) return <div className="p-8 text-center text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200">Nenhum chamado vinculado à loja {lojaNumero}.</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs">
        <div className="flex items-center gap-4">
          <div><span className="text-slate-500 font-medium">Total de Chamados:</span> <strong className="text-slate-900">{chamados.length}</strong></div>
          <div><span className="text-slate-500 font-medium">Valor Acumulado:</span> <strong className="text-emerald-700">R$ {totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></div>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">Loja {lojaNumero}</span>
      </div>

      <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2.5 text-left">Chamado</th>
              <th className="px-3 py-2.5 text-left">Data Abertura</th>
              <th className="px-3 py-2.5 text-left">Tipo</th>
              <th className="px-3 py-2.5 text-left">NF Venda</th>
              <th className="px-3 py-2.5 text-right">Valor</th>
              <th className="px-3 py-2.5 text-left">Situação (Tarefa)</th>
              <th className="px-3 py-2.5 text-left">Status</th>
              <th className="px-3 py-2.5 text-left">SLA</th>
              <th className="px-3 py-2.5 text-left">Data Pagamento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80 text-slate-700">
            {chamados.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-3 py-2 font-bold text-emerald-700">#{c.chamado}</td>
                <td className="px-3 py-2 text-slate-600">{c.dt_abertura ? c.dt_abertura.slice(0, 10) : "—"}</td>
                <td className="px-3 py-2 text-slate-700">{c.tipo || "—"}</td>
                <td className="px-3 py-2 text-slate-700">{c.nf || "—"}</td>
                <td className="px-3 py-2 text-right font-semibold text-slate-900">{c.valor != null ? `R$ ${Number(c.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</td>
                <td className="px-3 py-2 text-slate-700 max-w-[180px] truncate" title={c.situacao}>{c.situacao || "—"}</td>
                <td className="px-3 py-2 font-medium">{c.status_chamado || "—"}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${c.sla_status === "Dentro do SLA" ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" : c.sla_status === "Fora do SLA" ? "bg-rose-50 text-rose-700 border border-rose-200/60" : "bg-sky-50 text-sky-700 border border-sky-200/60"}`}>
                    {c.sla_status || "Em Aberto"}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-600">{c.dt_pagamento ? c.dt_pagamento.slice(0, 10) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
