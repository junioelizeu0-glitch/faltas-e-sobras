import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Loader2, Save, X, Search, Pencil, Trash2, Lock, Download, Sparkles, FileSpreadsheet, Building2, Layers, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import Pagination from "./Pagination";
import { listLojas, upsertLoja, deleteLoja, getParceiroByLoja, listChamadosByLoja, type Loja, type ChamadoVinculadoLoja } from "@/lib/lojas.functions";
import { exportToExcel } from "@/lib/excel-export";

const PAGE_SIZE = 30;
const EMPTY: Loja = {
  id: "", numero: "", parceiro: "", cnpj: "", razao_social: "", tipo: "", banco: "", agencia: "", agencia_dig: "",
  conta: "", conta_dig: "", observacao: "",
};

export default function CadastroLojas({ buscaInicial }: { buscaInicial?: string } = {}) {
  const list = useServerFn(listLojas);
  const up = useServerFn(upsertLoja);
  const del = useServerFn(deleteLoja);
  const getChamadosLoja = useServerFn(listChamadosByLoja);
  const [rows, setRows] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState(buscaInicial || "");
  const [editing, setEditing] = useState<Loja | null>(null);
  const [viewing, setViewing] = useState<Loja | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<"dados" | "chamados">("dados");
  const [chamadosLoja, setChamadosLoja] = useState<ChamadoVinculadoLoja[]>([]);
  const [loadingChamados, setLoadingChamados] = useState(false);
  const [filtroModuloChamados, setFiltroModuloChamados] = useState<"todos" | "faltas" | "recall">("todos");
  const [exportando, setExportando] = useState(false);
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

    // Se a busca contiver apenas números (ex: "35"), faz correspondência exata para número da loja ou código de parceiro
    const isOnlyDigits = /^\d+$/.test(q);
    if (isOnlyDigits) {
      const qStripped = q.replace(/^0+/, "");
      return rows.filter((r) => {
        const numStr = String(r.numero ?? "").trim().toLowerCase();
        const numStripped = numStr.replace(/^0+/, "");
        const parcStr = String(r.parceiro ?? "").trim().toLowerCase();
        const parcStripped = parcStr.replace(/^0+/, "");

        // Correspondência exata no número da loja (com ou sem zeros à esquerda)
        const matchNumero = numStr === q || (qStripped && numStripped === qStripped);
        // Correspondência exata no código de parceiro (com ou sem zeros à esquerda)
        const matchParceiro = parcStr === q || (qStripped && parcStripped === qStripped);

        return matchNumero || matchParceiro;
      });
    }

    // Se contiver letras, pontuações ou outros caracteres, busca textual por sub-string nos campos
    return rows.filter((r) =>
      [r.numero, r.parceiro, r.cnpj, r.razao_social, r.banco].some((v) =>
        String(v ?? "").toLowerCase().includes(q)
      )
    );
  }, [rows, busca]);

  useEffect(() => { setPage(0); }, [busca, rows.length]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page]);

  const save = async () => {
    if (!editing) return;
    const numLimpo = String(editing.numero || "").trim();
    if (!numLimpo) {
      setErr("O número da loja é obrigatório.");
      toast.error("O número da loja é obrigatório.");
      return;
    }

    setErr(null); setSaving(true);
    try {
      const payload: Partial<Loja> & { numero: string } = {
        ...editing,
        numero: numLimpo,
        id: editing.id && String(editing.id).trim() !== "" ? editing.id : undefined,
      };
      await up({ data: payload as any });
      toast.success("Loja salva com sucesso");
      setEditing(null);
      await load();
    } catch (e: any) {
      const msg = e?.message || "Erro ao salvar loja";
      setErr(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r: Loja) => {
    if (!confirm(`Remover loja "${r.numero}"?`)) return;
    try { await del({ data: { id: r.id } }); toast.success("Loja removida"); await load(); }
    catch (e: any) { toast.error(e?.message || "Erro ao remover loja"); }
  };

  const handleExportarLojas = () => {
    if (filtered.length === 0) {
      toast.error("Nenhuma loja encontrada para exportar.");
      return;
    }
    setExportando(true);
    try {
      const dataToExport = filtered.map((r) => ({
        "Número da Loja": r.numero || "",
        "Cód. Parceiro": r.parceiro || "",
        "Razão Social": r.razao_social || "",
        "CNPJ": r.cnpj || "",
        "Tipo": r.tipo || "",
        "Banco": r.banco || "",
        "Agência": r.agencia ? `${r.agencia}${r.agencia_dig ? "-" + r.agencia_dig : ""}` : "",
        "Conta": r.conta ? `${r.conta}${r.conta_dig ? "-" + r.conta_dig : ""}` : "",
        "Observação": r.observacao || "",
      }));

      const dateStr = new Date().toISOString().slice(0, 10);
      exportToExcel(dataToExport, {
        filename: `Relatorio_Cadastro_Lojas_${dateStr}.xlsx`,
        sheetName: "Lojas",
      });
      toast.success(`${dataToExport.length} lojas exportadas com sucesso!`);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao exportar relatório de lojas");
    } finally {
      setExportando(false);
    }
  };

  const carregarChamadosLoja = async (lojaNumero: string) => {
    setLoadingChamados(true);
    setChamadosLoja([]);
    try {
      const dados = await getChamadosLoja({ data: { numero: lojaNumero } });
      setChamadosLoja(dados || []);
    } catch (e: any) {
      console.warn("Erro ao buscar chamados da loja:", e);
      toast.error("Não foi possível carregar os chamados da loja.");
    } finally {
      setLoadingChamados(false);
    }
  };

  const handleOpenViewing = (loja: Loja) => {
    setViewing(loja);
    setActiveViewTab("dados");
    carregarChamadosLoja(loja.numero);
  };

  return (
    <div className="flex-1 min-h-screen bg-[#F4F6F5] p-4 md:p-6 space-y-6 text-slate-800 font-sans">
      <div className="w-full bg-white rounded-2xl border border-slate-200/70 shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-6 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Cadastro de Lojas</h1>
            <p className="text-xs text-slate-500 mt-1">
              Vinculação de Código de Parceiro, dados bancários e cadastrais corporativos. Total: {filtered.length.toLocaleString("pt-BR")} lojas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportarLojas}
              disabled={exportando || filtered.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl cursor-pointer shadow-xs transition-colors disabled:opacity-50"
              title="Exportar planilha Excel com as lojas filtradas"
            >
              {exportando ? <Loader2 className="w-4 h-4 animate-spin text-emerald-600"/> : <FileSpreadsheet className="w-4 h-4 text-emerald-700"/>}
              <span>Exportar Lojas</span>
            </button>
            <button
              onClick={() => { setErr(null); setEditing({ ...EMPTY }); }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl cursor-pointer shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4"/>
              <span>Nova Loja</span>
            </button>
          </div>
        </header>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por número da loja, parceiro, CNPJ, razão social ou banco..."
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
          />
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-x-auto w-full">
          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <Loader2 className="inline w-6 h-6 animate-spin mr-2 text-emerald-600"/>
              <span>Carregando lojas...</span>
            </div>
          ) : (
            <table className="min-w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Loja</th>
                  <th className="px-4 py-3">Parceiro</th>
                  <th className="px-4 py-3">Razão Social</th>
                  <th className="px-4 py-3">CNPJ</th>
                  <th className="px-4 py-3">Banco</th>
                  <th className="px-4 py-3">Ag / Conta</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginated.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors cursor-pointer" onClick={() => handleOpenViewing(r)}>
                    <td className="px-4 py-3 font-bold text-slate-900">{r.numero}</td>
                    <td className="px-4 py-3">
                      {r.parceiro ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-mono">
                          {r.parceiro}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
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
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
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

      {/* Modal de visualização com Abas: Dados Cadastrais e Chamados Vinculados */}
      {viewing && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Cabeçalho do Modal */}
            <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100/80 flex items-center justify-center text-emerald-800">
                  <Building2 className="w-4 h-4"/>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>Loja {viewing.numero}</span>
                    {viewing.parceiro && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-semibold">
                        Parceiro: {viewing.parceiro}
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate max-w-sm sm:max-w-md">
                    {viewing.razao_social || "Sem razão social registrada"}
                  </p>
                </div>
              </div>
              <button onClick={() => setViewing(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5"/>
              </button>
            </div>

            {/* Navegação por Abas no Modal */}
            <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 pt-3 border-b border-slate-200 bg-white">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveViewTab("dados")}
                  className={`inline-flex items-center gap-2 pb-3 px-1 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                    activeViewTab === "dados"
                      ? "border-emerald-700 text-emerald-800"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Dados Cadastrais</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViewTab("chamados")}
                  className={`inline-flex items-center gap-2 pb-3 px-1 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                    activeViewTab === "chamados"
                      ? "border-emerald-700 text-emerald-800"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Chamados da Loja</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    chamadosLoja.length > 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                  }`}>
                    {chamadosLoja.length}
                  </span>
                </button>
              </div>

              {activeViewTab === "chamados" && (
                <div className="flex items-center gap-1.5 pb-2">
                  {(["todos", "faltas", "recall"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFiltroModuloChamados(m)}
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                        filtroModuloChamados === m
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {m === "todos" ? "Todos" : m === "faltas" ? "Faltas e Sobras" : "Recall"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Conteúdo da Aba 1: Dados Cadastrais */}
            {activeViewTab === "dados" && (
              <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4 text-xs">
                {[
                  ["Número da Loja", viewing.numero],
                  ["Cód. Parceiro", viewing.parceiro],
                  ["Razão Social", viewing.razao_social],
                  ["CNPJ", viewing.cnpj],
                  ["Tipo", viewing.tipo],
                  ["Banco", viewing.banco],
                  ["Agência", viewing.agencia ? `${viewing.agencia}${viewing.agencia_dig ? "-" + viewing.agencia_dig : ""}` : null],
                  ["Conta", viewing.conta ? `${viewing.conta}${viewing.conta_dig ? "-" + viewing.conta_dig : ""}` : null],
                  ["Observação", viewing.observacao],
                ].map(([label, val]) => (
                  <div key={label as string} className={label === "Razão Social" || label === "Observação" ? "col-span-1 sm:col-span-2" : ""}>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</div>
                    <div className="mt-1 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-slate-800 font-medium min-h-[38px] flex items-center break-words">
                      {val || "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Conteúdo da Aba 2: Chamados Vinculados a esta Loja */}
            {activeViewTab === "chamados" && (
              <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4">
                {/* Resumo Rápido dos Chamados da Loja */}
                {(() => {
                  const filteredChamados = chamadosLoja.filter((c) =>
                    filtroModuloChamados === "todos" ? true : c.modulo === filtroModuloChamados
                  );
                  const totalValor = filteredChamados.reduce((acc, c) => acc + (c.valor || 0), 0);
                  const abertos = filteredChamados.filter((c) => !c.dt_finalizacao || c.dt_finalizacao.trim() === "" || c.dt_finalizacao.trim() === "-");
                  const concluidos = filteredChamados.filter((c) => c.dt_finalizacao && c.dt_finalizacao.trim() !== "" && c.dt_finalizacao.trim() !== "-");

                  return (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total de Chamados</span>
                          <div className="text-lg font-bold text-slate-900 mt-0.5">{filteredChamados.length}</div>
                        </div>
                        <div className="bg-amber-50/60 border border-amber-200/60 rounded-xl p-3">
                          <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Em Aberto
                          </span>
                          <div className="text-lg font-bold text-amber-800 mt-0.5">{abertos.length}</div>
                        </div>
                        <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-xl p-3">
                          <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Concluídos
                          </span>
                          <div className="text-lg font-bold text-emerald-800 mt-0.5">{concluidos.length}</div>
                        </div>
                        <div className="bg-sky-50/60 border border-sky-200/60 rounded-xl p-3">
                          <span className="text-[10px] font-semibold text-sky-700 uppercase tracking-wider">Valor Acumulado</span>
                          <div className="text-lg font-bold text-sky-900 mt-0.5">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalValor)}
                          </div>
                        </div>
                      </div>

                      {/* Tabela de Chamados da Loja */}
                      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-x-auto w-full">
                        {loadingChamados ? (
                          <div className="p-8 text-center text-slate-500 text-xs">
                            <Loader2 className="inline w-5 h-5 animate-spin mr-2 text-emerald-600"/>
                            <span>Buscando chamados da loja...</span>
                          </div>
                        ) : filteredChamados.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 text-xs">
                            Nenhum chamado encontrado para a loja {viewing.numero} {filtroModuloChamados !== "todos" ? `no módulo ${filtroModuloChamados === "faltas" ? "Faltas e Sobras" : "Recall"}` : ""}.
                          </div>
                        ) : (
                          <table className="min-w-full text-xs text-left border-collapse">
                            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                              <tr>
                                <th className="px-3.5 py-2.5">Módulo</th>
                                <th className="px-3.5 py-2.5">Chamado</th>
                                <th className="px-3.5 py-2.5">CD</th>
                                <th className="px-3.5 py-2.5">NF</th>
                                <th className="px-3.5 py-2.5">Abertura</th>
                                <th className="px-3.5 py-2.5">Tarefa Atual / Situação</th>
                                <th className="px-3.5 py-2.5">Status</th>
                                <th className="px-3.5 py-2.5 text-right">Valor</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {filteredChamados.map((c) => {
                                const isFinalizado = Boolean(c.dt_finalizacao && c.dt_finalizacao.trim() !== "" && c.dt_finalizacao.trim() !== "-");
                                return (
                                  <tr key={`${c.modulo}-${c.id}`} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="px-3.5 py-2.5">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                        c.modulo === "recall" ? "bg-teal-50 text-teal-800 border border-teal-200/60" : "bg-emerald-50 text-emerald-800 border border-emerald-200/60"
                                      }`}>
                                        {c.modulo === "recall" ? "Recall" : "Faltas"}
                                      </span>
                                    </td>
                                    <td className="px-3.5 py-2.5 font-bold text-slate-900 font-mono">{c.chamado || "—"}</td>
                                    <td className="px-3.5 py-2.5 font-semibold text-slate-700">{c.cd || "—"}</td>
                                    <td className="px-3.5 py-2.5 font-mono text-slate-600">{c.nf || "—"}</td>
                                    <td className="px-3.5 py-2.5 text-slate-600 whitespace-nowrap">
                                      {c.dt_abertura ? c.dt_abertura.split("-").reverse().join("/") : "—"}
                                    </td>
                                    <td className="px-3.5 py-2.5 text-slate-700 font-medium max-w-[200px] truncate" title={c.situacao}>
                                      {c.situacao || "—"}
                                    </td>
                                    <td className="px-3.5 py-2.5">
                                      {isFinalizado ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                          {c.status_chamado || "Concluído"}
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                          {c.status_chamado || "Em Aberto"}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3.5 py-2.5 text-right font-bold text-slate-900 whitespace-nowrap">
                                      {c.valor > 0
                                        ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c.valor)
                                        : "—"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Rodapé do Modal */}
            <div className="shrink-0 flex justify-end gap-2 px-4 sm:px-6 py-3.5 border-t border-slate-200 bg-slate-50">
              <button onClick={() => { setEditing(viewing); setViewing(null); }} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl cursor-pointer border border-emerald-200/60">
                <Pencil className="w-3.5 h-3.5"/> Editar Loja
              </button>
              <button onClick={() => setViewing(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edição/criação */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900">{editing.id ? "Editar" : "Nova"} loja</h3>
              <button onClick={() => setEditing(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5"/>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-5 pb-8">
              {err && <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3 font-semibold">{err}</div>}
              
              <div className="flex flex-wrap items-end gap-3 sm:gap-4">
                <div className="w-full sm:w-36 shrink-0">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Número da Loja *</span>
                    <input
                      inputMode="numeric"
                      value={editing?.numero ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const num = onlyDigits(raw);
                        const autoParceiro = getParceiroByLoja(num) || "";
                        setEditing((prev) => {
                          if (!prev) return prev;
                          // Auto-preenche o parceiro se estiver vazio ou se acompanhou o número anterior
                          const shouldUpdate = !prev.parceiro || prev.parceiro === getParceiroByLoja(prev.numero);
                          return {
                            ...prev,
                            numero: num,
                            parceiro: shouldUpdate && autoParceiro ? autoParceiro : prev.parceiro,
                          };
                        });
                      }}
                      placeholder="Ex.: 101"
                      className="mt-1.5 w-full text-sm rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white font-medium"
                    />
                  </label>
                </div>

                <div className="w-full sm:w-36 shrink-0">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600 flex items-center justify-between">
                      <span>Nº Parceiro</span>
                      {editing?.numero && getParceiroByLoja(editing.numero) && (
                        <button
                          type="button"
                          onClick={() => {
                            const p = getParceiroByLoja(editing.numero);
                            if (p) setEditing((prev) => prev ? ({ ...prev, parceiro: p }) : prev);
                          }}
                          className="text-[10px] text-emerald-700 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                          title="Puxar código de parceiro oficial da tabela"
                        >
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          <span>Puxar</span>
                        </button>
                      )}
                    </span>
                    <input
                      inputMode="numeric"
                      value={editing?.parceiro ?? ""}
                      onChange={(e) => setEditing({ ...(editing as Loja), parceiro: onlyDigits(e.target.value) })}
                      placeholder="Ex.: 375"
                      className="mt-1.5 w-full text-sm rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white font-medium font-mono text-emerald-800"
                    />
                  </label>
                </div>

                <label className="flex-1 min-w-[220px] block">
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

            <div className="shrink-0 flex justify-end gap-3 px-4 sm:px-6 py-3.5 border-t border-slate-200 bg-slate-50">
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
