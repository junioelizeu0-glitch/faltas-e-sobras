import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCcw, Search } from "lucide-react";
import { listAuditLog } from "@/lib/audit.functions";

const TABLES = ["", "chamados_faltas", "chamados_etapas", "chamados_referencias", "lojas", "transportadoras", "conferentes", "motivos", "tarefas_catalogo"];
const ACTIONS = ["", "INSERT", "UPDATE", "DELETE"];

const TABLE_LABELS: Record<string, string> = {
  chamados_faltas: "Chamado",
  chamados_etapas: "Etapa do chamado",
  chamados_referencias: "Referência do chamado",
  lojas: "Loja",
  transportadoras: "Transportadora",
  conferentes: "Conferente",
  motivos: "Motivo",
  tarefas_catalogo: "Tarefa (catálogo)",
  produtos: "Produto",
};

const FIELD_LABELS: Record<string, string> = {
  situacao: "Situação (tarefa atual)",
  status_chamado: "Status do chamado",
  status_pagamento: "Status de pagamento",
  dt_abertura: "Data de abertura",
  dt_finalizacao: "Data de finalização",
  dt_emissao: "Data de emissão",
  dt_pagamento: "Data de pagamento",
  transportadora: "Transportadora",
  conferente: "Conferente",
  motivo: "Motivo",
  cd: "CD",
  loja: "Loja",
  nf: "NF",
  valor: "Valor",
  tipo: "Tipo",
  periodo: "Período",
  sla_status: "SLA",
  nome_tarefa: "Tarefa",
  dt_inicio: "Início",
  dt_fim: "Fim",
  ordem: "Ordem",
  dias_uteis_previsto: "Dias úteis previstos",
  dias_uteis_real: "Dias úteis reais",
  referencia: "Referência",
  descricao: "Descrição",
  quantidade: "Quantidade",
  cor: "Cor",
  tamanho: "Tamanho",
  fornecedor: "Fornecedor",
  razao_social: "Razão Social",
  cnpj: "CNPJ",
  numero: "Número",
  banco: "Banco",
  agencia: "Agência",
  conta: "Conta",
};

// campos ignorados no resumo
const IGNORE = new Set(["id", "created_at", "updated_at", "chamado_id", "tarefa_id", "row_id"]);

const labelField = (k: string) => FIELD_LABELS[k] || k.replace(/_/g, " ");
const labelTable = (t: string) => TABLE_LABELS[t] || t;

const fmtValue = (v: any): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d.toLocaleDateString("pt-BR");
  }
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

const fmtDate = (iso: string) => new Date(iso).toLocaleString("pt-BR");

const badgeCls = (a: string) =>
  a === "INSERT" ? "bg-green-100 text-green-700" : a === "UPDATE" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700";

const actionLabel = (a: string) => (a === "INSERT" ? "Incluído" : a === "UPDATE" ? "Alterado" : "Excluído");

function summarize(r: any): string {
  if (r.action === "INSERT") {
    const nd = r.new_data || {};
    if (r.table_name === "chamados_etapas") return `Nova etapa: ${nd.nome_tarefa || "—"}`;
    if (r.table_name === "chamados_referencias") return `Nova referência: ${nd.referencia || nd.descricao || "—"}`;
    if (r.table_name === "chamados_faltas") return `Chamado ${nd.chamado || ""} criado`;
    return `${labelTable(r.table_name)} criado(a)`;
  }
  if (r.action === "DELETE") {
    const od = r.old_data || {};
    if (r.table_name === "chamados_etapas") return `Etapa removida: ${od.nome_tarefa || "—"}`;
    if (r.table_name === "chamados_referencias") return `Referência removida: ${od.referencia || od.descricao || "—"}`;
    return `${labelTable(r.table_name)} excluído(a)`;
  }
  // UPDATE
  const diff = r.diff || {};
  const keys = Object.keys(diff).filter((k) => !IGNORE.has(k));
  if (keys.length === 0) return "Sem alterações relevantes";
  return keys.map((k) => `${labelField(k)}: ${fmtValue(diff[k].old)} → ${fmtValue(diff[k].new)}`).join(" • ");
}

export default function AuditLogViewer() {
  const listFn = useServerFn(listAuditLog);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [table, setTable] = useState("");
  const [action, setAction] = useState("");
  const [chamado, setChamado] = useState("");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const load = async () => {
    setLoading(true);
    try {
      const data: any = await listFn({ data: { table: table || undefined, action: action || undefined, chamado: chamado || undefined, limit: 500 } });
      setRows(data || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Log de Alterações</h1>
        <button onClick={load} className="inline-flex items-center gap-1 px-3 py-2 text-sm text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50">
          <RefreshCcw className="w-4 h-4" />Atualizar
        </button>
      </header>

      <div className="bg-white p-3 rounded-lg border border-slate-200 mb-3 flex flex-wrap gap-2 items-end">
        <label className="flex flex-col text-xs font-semibold text-slate-600">Tabela
          <select value={table} onChange={(e) => setTable(e.target.value)} className="mt-1 text-sm border border-slate-300 rounded-md px-2 py-1.5">
            {TABLES.map((t) => <option key={t} value={t}>{t ? labelTable(t) : "Todas"}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-xs font-semibold text-slate-600">Ação
          <select value={action} onChange={(e) => setAction(e.target.value)} className="mt-1 text-sm border border-slate-300 rounded-md px-2 py-1.5">
            {ACTIONS.map((t) => <option key={t} value={t}>{t ? actionLabel(t) : "Todas"}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-xs font-semibold text-slate-600">Chamado
          <input value={chamado} onChange={(e) => setChamado(e.target.value)} className="mt-1 text-sm border border-slate-300 rounded-md px-2 py-1.5" placeholder="ex: 123456" />
        </label>
        <button onClick={load} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md">
          <Search className="w-4 h-4"/>Filtrar
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-6 flex justify-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin mr-2"/>Carregando...</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">Nenhum registro.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px]">
              <tr>
                <th className="px-3 py-2 text-left w-40">Data</th>
                <th className="px-3 py-2 text-left w-40">Tabela</th>
                <th className="px-3 py-2 text-left w-24">Ação</th>
                <th className="px-3 py-2 text-left w-28">Chamado</th>
                <th className="px-3 py-2 text-left">Alterações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const isExp = expanded[r.id];
                const summary = summarize(r);
                return (
                  <>
                    <tr key={r.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setExpanded((p) => ({ ...p, [r.id]: !p[r.id] }))}>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-700">{fmtDate(r.created_at)}</td>
                      <td className="px-3 py-2 text-slate-600">{labelTable(r.table_name)}</td>
                      <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded font-semibold ${badgeCls(r.action)}`}>{actionLabel(r.action)}</span></td>
                      <td className="px-3 py-2 text-slate-700 font-medium">{r.chamado_num || "—"}</td>
                      <td className="px-3 py-2 text-slate-600">{summary}</td>
                    </tr>
                    {isExp && (
                      <tr key={`${r.id}-x`} className="bg-slate-50">
                        <td colSpan={5} className="px-3 py-3">
                          {r.action === "UPDATE" && r.diff ? (
                            <div className="space-y-1">
                              {Object.entries(r.diff).filter(([k]) => !IGNORE.has(k)).map(([k, v]: any) => (
                                <div key={k} className="text-xs flex flex-wrap gap-1 items-center">
                                  <span className="font-semibold text-slate-700">{labelField(k)}:</span>
                                  <span className="line-through text-red-500">{fmtValue(v.old)}</span>
                                  <span className="text-slate-400">→</span>
                                  <span className="text-green-700 font-medium">{fmtValue(v.new)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {Object.entries((r.new_data || r.old_data) || {})
                                .filter(([k]) => !IGNORE.has(k))
                                .map(([k, v]: any) => (
                                  <div key={k} className="text-xs">
                                    <span className="font-semibold text-slate-700">{labelField(k)}:</span>{" "}
                                    <span className="text-slate-600">{fmtValue(v)}</span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
