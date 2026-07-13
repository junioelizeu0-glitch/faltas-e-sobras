import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Search, X, Loader2, CheckCircle2, AlertCircle, Save, Pencil } from "lucide-react";
import { fetchDashboardData, updateChamado } from "@/lib/dashboard.functions";
import { parseDataBR } from "@/lib/data-processing";

const STATUS_CHAMADO_OPCOES = ["Pendente Monitoramento", "Aprovado", "Recusado"];
const SITUACAO_OPCOES = [
  "Aguardando monitoramento",
  "Aguardando NF Espelho",
  "Validação NF Espelho",
  "Aguardando NFD",
  "Emitir NFD",
  "Importação NF",
  "Dados Bancários",
  "Enviada Solicitação Provisionamento",
  "Pendente Provisionamento Financeiro",
  "Pagamento Provisionado",
  "Chamado Recusado",
  "Sem retorno (Finalizado)",
  "Finalizado",
];
const TIPO_OPCOES = ["Franquia", "Própria"];
const CD_OPCOES = ["ES", "PB"];

const FERIADOS_FIXOS = new Set([
  "01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "12-25",
]);
function isDiaUtil(d: Date) {
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return false;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return !FERIADOS_FIXOS.has(`${mm}-${dd}`);
}
function diasUteisEntre(ini: Date, fim: Date): number {
  if (fim < ini) return 0;
  let count = 0;
  const cur = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate());
  const end = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate());
  while (cur <= end) {
    if (isDiaUtil(cur)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(0, count - 1);
}
function diasUteisAteHoje(dtAbertura: string): number | null {
  const ini = parseDataBR(dtAbertura);
  if (!ini) return null;
  return diasUteisEntre(ini, new Date());
}
function slaCalc(dtAbertura: string, dtFinal: string): string {
  const ini = parseDataBR(dtAbertura);
  if (!ini) return "";
  const fim = parseDataBR(dtFinal);
  if (!fim) return "Em Aberto";
  return diasUteisEntre(ini, fim) <= 60 ? "Dentro do SLA" : "Fora do SLA";
}

function fmtDateBR(iso: string): string {
  if (!iso) return "—";
  const d = parseDataBR(iso);
  if (!d) return iso;
  return d.toLocaleDateString("pt-BR");
}

function slaBadge(dtAbertura: string, dtFinal: string) {
  if (dtFinal) {
    const s = slaCalc(dtAbertura, dtFinal);
    const dias = (() => {
      const i = parseDataBR(dtAbertura);
      const f = parseDataBR(dtFinal);
      return i && f ? diasUteisEntre(i, f) : null;
    })();
    const ok = s === "Dentro do SLA";
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
        {s}{dias != null ? ` · ${dias}d` : ""}
      </span>
    );
  }
  const dias = diasUteisAteHoje(dtAbertura);
  if (dias == null) return <span className="text-slate-400">—</span>;
  const cor = dias > 60 ? "bg-red-50 text-red-700" : dias > 45 ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700";
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${cor}`}>Em aberto · {dias}d</span>;
}

function statusBadge(status: string) {
  const s = (status || "").toLowerCase();
  const cor = s.includes("aprov") ? "bg-emerald-50 text-emerald-700"
    : s.includes("recus") ? "bg-red-50 text-red-700"
    : "bg-amber-50 text-amber-700";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${cor}`}>{status || "—"}</span>;
}

type Props = {
  rawData: any[] | undefined;
  onChanged?: () => void;
};

export default function ConsultaChamados({ rawData, onChanged }: Props) {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [editing, setEditing] = useState<any | null>(null);

  const { linhas, transportadoras, conferentes, motivos } = useMemo(() => {
    const t = new Set<string>();
    const c = new Set<string>();
    const m = new Set<string>();
    (rawData || []).forEach((r: any) => {
      const tr = String(r.Transportadora || "").trim();
      const co = String(r.Conferente || "").trim();
      const mo = String(r.Motivo || "").trim();
      if (tr) t.add(tr);
      if (co) c.add(co);
      if (mo && mo !== "#N/D") m.add(mo);
    });
    const filtro = busca.trim().toLowerCase();
    const linhas = (rawData || [])
      .filter((r: any) => {
        if (filtroStatus !== "Todos" && String(r["Status Chamado"] || "") !== filtroStatus) return false;
        if (!filtro) return true;
        return [r.Chamado, r.Loja, r.NF, r.Transportadora, r.Conferente, r["Situação "]]
          .map((v) => String(v ?? "").toLowerCase())
          .some((s) => s.includes(filtro));
      })
      .sort((a: any, b: any) => {
        const da = parseDataBR(a["Dt Abertura"])?.getTime() ?? 0;
        const db = parseDataBR(b["Dt Abertura"])?.getTime() ?? 0;
        return db - da;
      });
    return {
      linhas,
      transportadoras: Array.from(t).sort(),
      conferentes: Array.from(c).sort(),
      motivos: Array.from(m).sort(),
    };
  }, [rawData, busca, filtroStatus]);

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-4">
          <h1 className="text-xl font-bold text-slate-800">Consulta de Chamados — Faltas</h1>
          <p className="text-sm text-slate-500 mt-1">Clique em um chamado para editar. Total: {linhas.length}</p>
        </header>

        <div className="flex flex-wrap items-center gap-3 mb-3 bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por chamado, loja, NF, transportadora, conferente..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            />
          </div>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="text-sm border border-slate-200 rounded-md px-3 py-2 bg-white cursor-pointer"
          >
            <option>Todos</option>
            {STATUS_CHAMADO_OPCOES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-260px)]">
            <table className="min-w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Chamado</th>
                  <th className="text-left px-3 py-2 font-semibold">Loja</th>
                  <th className="text-left px-3 py-2 font-semibold">Abertura</th>
                  <th className="text-left px-3 py-2 font-semibold">Tarefa Atual</th>
                  <th className="text-left px-3 py-2 font-semibold">Status</th>
                  <th className="text-left px-3 py-2 font-semibold">Transportadora</th>
                  <th className="text-left px-3 py-2 font-semibold">Conferente</th>
                  <th className="text-left px-3 py-2 font-semibold">SLA (dias úteis)</th>
                  <th className="text-right px-3 py-2 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((r: any) => (
                  <tr
                    key={r.id || r.Chamado}
                    onClick={() => setEditing(r)}
                    className="border-b border-slate-100 hover:bg-blue-50/40 cursor-pointer"
                  >
                    <td className="px-3 py-2 font-semibold text-slate-800">{r.Chamado || "—"}</td>
                    <td className="px-3 py-2">{r.Loja || "—"}</td>
                    <td className="px-3 py-2">{fmtDateBR(r["Dt Abertura"])}</td>
                    <td className="px-3 py-2 max-w-[220px] truncate" title={r["Situação "]}>{r["Situação "] || "—"}</td>
                    <td className="px-3 py-2">{statusBadge(r["Status Chamado"])}</td>
                    <td className="px-3 py-2 max-w-[160px] truncate" title={r.Transportadora}>{r.Transportadora || "—"}</td>
                    <td className="px-3 py-2 max-w-[160px] truncate" title={r.Conferente}>{r.Conferente || "—"}</td>
                    <td className="px-3 py-2">{slaBadge(r["Dt Abertura"], r["Dt Finalização"])}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditing(r); }}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-semibold"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </button>
                    </td>
                  </tr>
                ))}
                {linhas.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400">Nenhum chamado encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editing && (
        <EditModal
          chamado={editing}
          transportadoras={transportadoras}
          conferentes={conferentes}
          motivos={motivos}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onChanged?.(); }}
        />
      )}
    </div>
  );
}

function EditModal({
  chamado, transportadoras, conferentes, motivos, onClose, onSaved,
}: {
  chamado: any;
  transportadoras: string[];
  conferentes: string[];
  motivos: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const updateFn = useServerFn(updateChamado);
  const refetchFn = useServerFn(fetchDashboardData);

  const [form, setForm] = useState({
    Chamado: String(chamado.Chamado ?? ""),
    Loja: String(chamado.Loja ?? ""),
    Tipo: chamado.Tipo || "Franquia",
    NF: String(chamado.NF ?? ""),
    "Dt Emissão": chamado["Dt Emissão"] || "",
    CD: chamado.CD || "ES",
    "Situação ": chamado["Situação "] || "Aguardando monitoramento",
    "Dt Abertura": chamado["Dt Abertura"] || "",
    "Dt Finalização": chamado["Dt Finalização"] || "",
    "Dt Pagamento": chamado["Dt Pagamento"] || "",
    "Status Chamado": chamado["Status Chamado"] || "Pendente Monitoramento",
    Motivo: chamado.Motivo || "",
    Transportadora: chamado.Transportadora || "",
    Conferente: chamado.Conferente || "",
  });
  const [saving, setSaving] = useState(false);
  const [fb, setFb] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const setField = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const statusPagamento = form["Dt Pagamento"] ? "Pago" : "Não Pago";
  const sla = slaCalc(form["Dt Abertura"], form["Dt Finalização"]);
  const precisaTranspConf = form["Status Chamado"] === "Aprovado" || form["Status Chamado"] === "Recusado";
  const precisaMotivo = form["Status Chamado"] === "Aprovado";

  const inputCls = "w-full h-9 px-2.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFb(null);
    if (precisaTranspConf && (!form.Transportadora || !form.Conferente)) {
      setFb({ type: "err", msg: "Transportadora e Conferente são obrigatórios para Aprovado/Recusado" });
      return;
    }
    if (precisaMotivo && !form.Motivo) {
      setFb({ type: "err", msg: "Motivo é obrigatório para Aprovado" });
      return;
    }
    setSaving(true);
    try {
      await updateFn({
        data: {
          id: chamado.id,
          aba: "FALTAS",
          Chamado: form.Chamado,
          Loja: form.Loja,
          Tipo: form.Tipo,
          NF: form.NF,
          "Dt Emissão": form["Dt Emissão"],
          " Valor ": chamado[" Valor "] ?? "",
          CD: form.CD,
          "Situação ": form["Situação "],
          "Dt Abertura": form["Dt Abertura"],
          "Dt Finalização": form["Dt Finalização"],
          "Dt Pagamento": form["Dt Pagamento"],
          "SLA por chamado (60dias)": sla,
          "Status Pagamento": statusPagamento,
          "Status Chamado": form["Status Chamado"],
          Motivo: form.Motivo,
          Transportadora: form.Transportadora,
          Conferente: form.Conferente,
          Periodo: chamado.Periodo || "",
        },
      });
      setFb({ type: "ok", msg: "Chamado atualizado com sucesso." });
      try { await refetchFn(); } catch {}
      setTimeout(() => onSaved(), 700);
    } catch (e: any) {
      setFb({ type: "err", msg: e?.message || "Erro ao salvar" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-800">Editar Chamado nº {chamado.Chamado}</h2>
            <p className="text-xs text-slate-500">Loja {chamado.Loja} · Abertura {fmtDateBR(chamado["Dt Abertura"])}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-5 space-y-5">
          {fb && (
            <div className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${fb.type === "ok" ? "border-green-300 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}>
              {fb.type === "ok" ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
              <span>{fb.msg}</span>
            </div>
          )}

          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Identificação</h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <Field label="Chamado"><input value={form.Chamado} onChange={(e) => setField("Chamado", e.target.value)} className={inputCls} /></Field>
              <Field label="Loja"><input value={form.Loja} onChange={(e) => setField("Loja", e.target.value)} className={inputCls} /></Field>
              <Field label="Tipo">
                <select value={form.Tipo} onChange={(e) => setField("Tipo", e.target.value)} className={inputCls}>
                  {TIPO_OPCOES.map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="CD">
                <select value={form.CD} onChange={(e) => setField("CD", e.target.value)} className={inputCls}>
                  {CD_OPCOES.map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="NF"><input value={form.NF} onChange={(e) => setField("NF", e.target.value)} className={inputCls} /></Field>
              <Field label="Data Emissão"><input type="date" value={form["Dt Emissão"]} onChange={(e) => setField("Dt Emissão", e.target.value)} className={inputCls} /></Field>
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Status e Datas</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="Data Abertura"><input type="date" value={form["Dt Abertura"]} onChange={(e) => setField("Dt Abertura", e.target.value)} className={inputCls} /></Field>
              <Field label="Data Finalização"><input type="date" value={form["Dt Finalização"]} onChange={(e) => setField("Dt Finalização", e.target.value)} className={inputCls} /></Field>
              <Field label="Data Pagamento"><input type="date" value={form["Dt Pagamento"]} onChange={(e) => setField("Dt Pagamento", e.target.value)} className={inputCls} /></Field>
              <Field label="Status Pagamento (auto)"><input value={statusPagamento} readOnly className={inputCls + " bg-slate-50 text-slate-500"} /></Field>
              <Field label="Tarefa Atual (Situação)" className="col-span-2">
                <select value={form["Situação "]} onChange={(e) => setField("Situação ", e.target.value)} className={inputCls}>
                  {SITUACAO_OPCOES.map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Status Chamado">
                <select value={form["Status Chamado"]} onChange={(e) => setField("Status Chamado", e.target.value)} className={inputCls}>
                  {STATUS_CHAMADO_OPCOES.map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="SLA (auto)"><input value={sla || "—"} readOnly className={inputCls + " bg-slate-50 text-slate-500"} /></Field>
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Responsáveis {precisaTranspConf && <span className="ml-1 text-[10px] text-blue-600 normal-case">(obrigatório para {form["Status Chamado"]})</span>}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label={`Transportadora ${precisaTranspConf ? "*" : ""}`}>
                <input list="transp-edit" value={form.Transportadora} onChange={(e) => setField("Transportadora", e.target.value.toUpperCase())} className={inputCls} />
                <datalist id="transp-edit">{transportadoras.map((t) => <option key={t} value={t} />)}</datalist>
              </Field>
              <Field label={`Conferente ${precisaTranspConf ? "*" : ""}`}>
                <input list="conf-edit" value={form.Conferente} onChange={(e) => setField("Conferente", e.target.value.toUpperCase())} className={inputCls} />
                <datalist id="conf-edit">{conferentes.map((c) => <option key={c} value={c} />)}</datalist>
              </Field>
              <Field label={`Motivo ${precisaMotivo ? "*" : ""}`} className="md:col-span-2">
                <input list="motivo-edit" value={form.Motivo} onChange={(e) => setField("Motivo", e.target.value)} className={inputCls} />
                <datalist id="motivo-edit">{motivos.map((m) => <option key={m} value={m} />)}</datalist>
              </Field>
            </div>
          </section>
        </form>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50">
          <button onClick={onClose} type="button" className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900">Cancelar</button>
          <button
            onClick={handleSubmit as any}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar alterações
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[11px] font-semibold text-slate-500">{label}</span>
      {children}
    </label>
  );
}
