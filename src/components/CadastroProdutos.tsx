import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Loader2, Save, X, Search, Upload, Download, Pencil, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import { exportToExcel } from "@/lib/excel-export";
import {
  listProdutos, upsertProduto, deleteProduto, bulkUpsertProdutos, exportProdutos,
  type Produto,
} from "@/lib/cadastros.functions";
import Pagination from "./Pagination";

export default function CadastroProdutos() {
  const list = useServerFn(listProdutos);
  const up = useServerFn(upsertProduto);
  const del = useServerFn(deleteProduto);
  const bulk = useServerFn(bulkUpsertProdutos);
  const exp = useServerFn(exportProdutos);

  const [rows, setRows] = useState<Produto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Partial<Produto> | null>(null);
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const limit = 30;

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await list({ data: { search: busca, limit, offset: page * limit } });
      setRows(res.rows); setTotal(res.total);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [page]);
  useEffect(() => { const t = setTimeout(() => { setPage(0); load(); }, 300); return () => clearTimeout(t); }, [busca]);

  const save = async () => {
    if (!editing?.referencia) return;
    await up({ data: {
      id: editing.id, referencia: editing.referencia!, cor: editing.cor || "",
      descricao: editing.descricao || "", nome_parceiro: editing.nome_parceiro || "",
    }});
    setEditing(null); await load();
  };
  const remove = async (id: string) => {
    if (!confirm("Remover produto?")) return;
    await del({ data: { id } }); await load();
  };

  const doImport = async (file: File) => {
    setImporting(true); setMsg(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });
      const norm = data.map((r) => ({
        referencia: String(r["Referência"] ?? r["Referencia"] ?? r["referencia"] ?? "").trim(),
        cor: String(r["Cor"] ?? r["cor"] ?? "").trim(),
        descricao: String(r["Descrição"] ?? r["Descricao"] ?? r["descricao"] ?? "").trim(),
        nome_parceiro: String(r["Nome Parceiro (Parceiro Fornecedor)"] ?? r["Nome Parceiro"] ?? r["Fornecedor"] ?? r["nome_parceiro"] ?? "").trim(),
      })).filter((r) => r.referencia);
      const res: any = await bulk({ data: { rows: norm } });
      setMsg(`${res.inserted} novo(s) produto(s) importado(s). ${res.skipped || 0} já existente(s) ignorado(s).`);
      await load();
    } catch (e: any) { setMsg("Erro: " + (e?.message || String(e))); }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const doExport = async () => {
    const data: any[] = await exp();
    exportToExcel(data, {
      filename: `produtos_${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: "Produtos",
      columns: [
        { key: "referencia", header: "Referência" },
        { key: "cor", header: "Cor" },
        { key: "descricao", header: "Descrição" },
        { key: "nome_parceiro", header: "Fornecedor" },
      ],
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex-1 min-h-screen bg-[#F4F6F5] p-4 md:p-6 space-y-6 text-slate-800 font-sans">
      <div className="w-full bg-white rounded-2xl border border-slate-200/70 shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-6 space-y-6">
        <header className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-slate-100">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Base de Produtos</h1>
            <p className="text-xs text-slate-500 mt-1">Total: {total.toLocaleString("pt-BR")} produtos cadastrados</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])}/>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl disabled:opacity-50 transition-colors cursor-pointer"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4 text-emerald-700"/>}
              <span>Importar</span>
            </button>
            <button
              onClick={doExport}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-700"/>
              <span>Exportar</span>
            </button>
            <button
              onClick={() => setEditing({})}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl cursor-pointer shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4"/>
              <span>Novo Produto</span>
            </button>
          </div>
        </header>

        {msg && <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded-xl p-3 font-semibold">{msg}</div>}

        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por referência, descrição, fornecedor ou cor..."
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
          />
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <Loader2 className="inline w-6 h-6 animate-spin mr-2 text-emerald-600"/>
              <span>Carregando produtos...</span>
            </div>
          ) : (
            <table className="min-w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Referência</th>
                  <th className="px-4 py-3">Cor</th>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3">Fornecedor</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{r.referencia}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{r.cor}</td>
                    <td className="px-4 py-3 text-slate-700">{r.descricao || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{r.nome_parceiro || "—"}</td>
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
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <Pagination page={page} totalPages={totalPages} onChange={setPage} totalItems={total} pageSize={PAGE_SIZE} />
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900">{editing.id ? "Editar" : "Novo"} Produto</h3>
              <button onClick={() => setEditing(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5"/>
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <label className="block">
                <span className="font-semibold text-slate-600">Referência *</span>
                <input
                  value={editing.referencia || ""}
                  onChange={(e) => setEditing({ ...editing, referencia: e.target.value })}
                  placeholder="Ex.: 12345"
                  className="mt-1.5 w-full text-sm rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white font-medium"
                />
              </label>
              <label className="block">
                <span className="font-semibold text-slate-600">Cor</span>
                <input
                  value={editing.cor || ""}
                  onChange={(e) => setEditing({ ...editing, cor: e.target.value })}
                  placeholder="Ex.: Preto"
                  className="mt-1.5 w-full text-sm rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white font-medium"
                />
              </label>
              <label className="block">
                <span className="font-semibold text-slate-600">Descrição</span>
                <input
                  value={editing.descricao || ""}
                  onChange={(e) => setEditing({ ...editing, descricao: e.target.value })}
                  placeholder="Descrição do produto"
                  className="mt-1.5 w-full text-sm rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white font-medium"
                />
              </label>
              <label className="block">
                <span className="font-semibold text-slate-600">Fornecedor / Parceiro</span>
                <input
                  value={editing.nome_parceiro || ""}
                  onChange={(e) => setEditing({ ...editing, nome_parceiro: e.target.value })}
                  placeholder="Nome do parceiro"
                  className="mt-1.5 w-full text-sm rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white font-medium"
                />
              </label>
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
