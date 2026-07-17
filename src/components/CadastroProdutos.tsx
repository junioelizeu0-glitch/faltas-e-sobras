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

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-4">
      <div className="w-full">
        <header className="mb-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Base de Produtos</h1>
            <p className="text-sm text-slate-500 mt-1">Total: {total.toLocaleString("pt-BR")} produtos</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])}/>
            <button onClick={() => fileRef.current?.click()} disabled={importing} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md disabled:opacity-50">
              {importing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}Importar
            </button>
            <button onClick={doExport} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md"><Download className="w-4 h-4"/>Exportar</button>
            <button onClick={() => setEditing({})} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md"><Plus className="w-4 h-4"/>Novo</button>
          </div>
        </header>

        {msg && <div className="mb-3 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">{msg}</div>}

        <div className="mb-3 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por referência, descrição, fornecedor ou cor..." className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"/>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          {loading ? <div className="p-8 text-center"><Loader2 className="inline w-5 h-5 animate-spin mr-2"/>Carregando...</div> : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b text-xs uppercase text-slate-500">
                <tr>
                  <th className="text-left px-3 py-2">Referência</th><th className="text-left px-3 py-2">Cor</th>
                  <th className="text-left px-3 py-2">Descrição</th><th className="text-left px-3 py-2">Fornecedor</th>
                  <th className="text-right px-3 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono">{r.referencia}</td>
                    <td className="px-3 py-2">{r.cor}</td>
                    <td className="px-3 py-2">{r.descricao || "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{r.nome_parceiro || "—"}</td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <button onClick={() => setEditing(r)} title="Editar" className="inline-flex items-center p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-3.5 h-3.5"/></button>
                      <button onClick={() => remove(r.id)} title="Excluir" className="inline-flex items-center p-1.5 text-red-500 hover:bg-red-50 rounded ml-0.5"><Trash2 className="w-3.5 h-3.5"/></button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">Nenhum produto encontrado.</td></tr>}
              </tbody>
            </table>
          )}
        </div>

        <Pagination page={page} totalPages={totalPages} onChange={setPage} totalItems={total} pageSize={limit} />
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold">{editing.id ? "Editar" : "Novo"} produto</h3>
              <button><X className="w-5 h-5 text-slate-400"/></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label><span className="text-xs font-semibold text-slate-600">Referência *</span>
                  <input autoFocus value={editing.referencia || ""} onChange={(e) => setEditing({ ...editing, referencia: e.target.value })} className="mt-1 w-full text-sm rounded-md border border-slate-300 px-3 py-2"/></label>
                <label><span className="text-xs font-semibold text-slate-600">Cor</span>
                  <input value={editing.cor || ""} onChange={(e) => setEditing({ ...editing, cor: e.target.value })} className="mt-1 w-full text-sm rounded-md border border-slate-300 px-3 py-2"/></label>
              </div>
              <label className="block"><span className="text-xs font-semibold text-slate-600">Descrição</span>
                <input value={editing.descricao || ""} onChange={(e) => setEditing({ ...editing, descricao: e.target.value })} className="mt-1 w-full text-sm rounded-md border border-slate-300 px-3 py-2"/></label>
              <label className="block"><span className="text-xs font-semibold text-slate-600">Fornecedor</span>
                <input value={editing.nome_parceiro || ""} onChange={(e) => setEditing({ ...editing, nome_parceiro: e.target.value })} className="mt-1 w-full text-sm rounded-md border border-slate-300 px-3 py-2"/></label>
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
