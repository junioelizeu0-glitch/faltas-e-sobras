import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, CheckCircle2, AlertCircle, Save } from "lucide-react";
import { createChamado, fetchDashboardData } from "@/lib/dashboard.functions";
import { parseDataBR } from "@/lib/data-processing";

// Opções fixas derivadas da planilha
const STATUS_CHAMADO_OPCOES = ["Pendente Monitoramento", "Aprovado", "Recusado"];
const STATUS_PAGAMENTO_OPCOES = ["Não Pago", "Pago"];
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

// Feriados nacionais fixos (mês-dia) para cálculo de dias úteis
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

function diasUteisEntre(inicio: Date, fim: Date): number {
  if (fim < inicio) return 0;
  let count = 0;
  const cur = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const end = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate());
  while (cur <= end) {
    if (isDiaUtil(cur)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(0, count - 1); // exclui o dia de abertura
}

function calcularSLA(dtAbertura: string, dtFinalizacao: string): string {
  const ini = parseDataBR(dtAbertura);
  if (!ini) return "";
  const fim = parseDataBR(dtFinalizacao);
  if (!fim) return "Em Aberto";
  const dias = diasUteisEntre(ini, fim);
  return dias <= 60 ? "Dentro do SLA" : "Fora do SLA";
}

const hojeISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const primeiroDiaMesISO = (isoDate: string) => {
  const d = parseDataBR(isoDate);
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

type Props = {
  rawData: any[] | undefined;
  onCreated?: () => void;
};

export default function NovoChamadoForm({ rawData, onCreated }: Props) {
  const submitFn = useServerFn(createChamado);
  const refetchFn = useServerFn(fetchDashboardData);

  // Reaproveita listas existentes da planilha
  const { transportadoras, conferentes, motivos, proximoChamado } = useMemo(() => {
    const t = new Set<string>();
    const c = new Set<string>();
    const m = new Set<string>();
    let maxCh = 0;
    (rawData || []).forEach((r: any) => {
      const tr = String(r.Transportadora || "").trim();
      const co = String(r.Conferente || "").trim();
      const mo = String(r.Motivo || "").trim();
      if (tr) t.add(tr);
      if (co) c.add(co);
      if (mo && mo !== "#N/D") m.add(mo);
      const ch = Number(r.Chamado);
      if (!isNaN(ch) && ch > maxCh) maxCh = ch;
    });
    return {
      transportadoras: Array.from(t).sort(),
      conferentes: Array.from(c).sort(),
      motivos: Array.from(m).sort(),
      proximoChamado: maxCh ? maxCh + 1 : "",
    };
  }, [rawData]);

  const [form, setForm] = useState({
    Chamado: String(proximoChamado || ""),
    Loja: "",
    Tipo: "Franquia",
    NF: "",
    "Dt Emissão": "",
    CD: "ES",
    "Situação ": "Aguardando monitoramento",
    "Dt Abertura": hojeISO(),
    "Dt Finalização": "",
    "Dt Pagamento": "",
    "Status Chamado": "Pendente Monitoramento",
    Motivo: "",
    Transportadora: "",
    Conferente: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<
    { type: "ok" | "err"; msg: string } | null
  >(null);

  const statusChamado = form["Status Chamado"];
  const precisaTranspConf =
    statusChamado === "Aprovado" || statusChamado === "Recusado";
  const precisaMotivo = statusChamado === "Aprovado";

  const statusPagamento = form["Dt Pagamento"] ? "Pago" : "Não Pago";
  const slaCalc = calcularSLA(form["Dt Abertura"], form["Dt Finalização"]);

  const setField = (k: string, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const validate = (): string | null => {
    if (!form.Chamado) return "Número do chamado é obrigatório";
    if (!form.Loja) return "Loja é obrigatória";
    if (!form["Dt Abertura"]) return "Data de abertura é obrigatória";
    if (precisaTranspConf && !form.Transportadora)
      return "Transportadora é obrigatória para status Aprovado/Recusado";
    if (precisaTranspConf && !form.Conferente)
      return "Conferente é obrigatório para status Aprovado/Recusado";
    if (precisaMotivo && !form.Motivo)
      return "Motivo é obrigatório para status Aprovado";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const err = validate();
    if (err) {
      setFeedback({ type: "err", msg: err });
      return;
    }
    setSubmitting(true);
    try {
      await submitFn({
        data: {
          aba: "FALTAS",
          Chamado: form.Chamado,
          Loja: form.Loja,
          Tipo: form.Tipo,
          NF: form.NF,
          "Dt Emissão": form["Dt Emissão"],
          " Valor ": "",
          CD: form.CD,
          "Situação ": form["Situação "],
          "Dt Abertura": form["Dt Abertura"],
          "Dt Finalização": form["Dt Finalização"],
          "Dt Pagamento": form["Dt Pagamento"],
          "SLA por chamado (60dias)": slaCalc,
          "Status Pagamento": statusPagamento,
          "Status Chamado": form["Status Chamado"],
          Motivo: form.Motivo,
          Transportadora: form.Transportadora,
          Conferente: form.Conferente,
          Periodo: primeiroDiaMesISO(form["Dt Abertura"]),
        },
      });
      setFeedback({
        type: "ok",
        msg: `Chamado ${form.Chamado} incluído com sucesso na planilha.`,
      });
      // Reset e sugere próximo número
      const proximo = Number(form.Chamado) + 1;
      setForm((prev) => ({
        ...prev,
        Chamado: String(proximo),
        Loja: "",
        NF: "",
        "Dt Emissão": "",
        "Dt Finalização": "",
        "Dt Pagamento": "",
        "Status Chamado": "Pendente Monitoramento",
        "Situação ": "Aguardando monitoramento",
        Motivo: "",
        Transportadora: "",
        Conferente: "",
      }));
      try {
        await refetchFn();
      } catch {}
      onCreated?.();
    } catch (e: any) {
      setFeedback({ type: "err", msg: e?.message || "Erro ao enviar" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6">
          <h1 className="text-xl font-bold text-slate-800">
            Novo Chamado — Faltas
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Preencha o formulário abaixo. Os campos com regra automática serão
            calculados no envio.
          </p>
        </header>

        {feedback && (
          <div
            className={`mb-4 flex items-start gap-3 rounded-lg border px-4 py-4 shadow-sm ${
              feedback.type === "ok"
                ? "border-green-300 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {feedback.type === "ok" ? (
              <CheckCircle2 className="w-6 h-6 mt-0.5 shrink-0 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            )}
            <div className="flex-1">
              {feedback.type === "ok" && (
                <div className="font-bold text-base leading-tight">Chamado salvo com sucesso!</div>
              )}
              <div className="text-sm">{feedback.msg}</div>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6"
        >
          {/* Identificação */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Identificação
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <Field label="Chamado *">
                <input
                  type="number"
                  value={form.Chamado}
                  onChange={(e) => setField("Chamado", e.target.value.slice(0, 8))}
                  maxLength={8}
                  className={inputCls}
                  required
                />
              </Field>
              <Field label="Loja *">
                <input
                  type="number"
                  value={form.Loja}
                  onChange={(e) => setField("Loja", e.target.value.slice(0, 5))}
                  maxLength={5}
                  className={inputCls}
                  required
                />
              </Field>
              <Field label="Tipo">
                <select
                  value={form.Tipo}
                  onChange={(e) => setField("Tipo", e.target.value)}
                  className={inputCls}
                >
                  {TIPO_OPCOES.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </Field>
              <Field label="CD">
                <select
                  value={form.CD}
                  onChange={(e) => setField("CD", e.target.value)}
                  className={inputCls}
                >
                  {CD_OPCOES.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </Field>
              <Field label="NF" className="col-span-2 md:col-span-1">
                <input
                  type="number"
                  value={form.NF}
                  onChange={(e) => setField("NF", e.target.value.slice(0, 10))}
                  maxLength={10}
                  className={inputCls}
                />
              </Field>
              <Field label="Data Emissão" className="col-span-2 md:col-span-1">
                <input
                  type="date"
                  value={form["Dt Emissão"]}
                  onChange={(e) => setField("Dt Emissão", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
          </section>

          {/* Status e Datas */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Status e Datas
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Data Abertura *">
                <input
                  type="date"
                  value={form["Dt Abertura"]}
                  onChange={(e) => setField("Dt Abertura", e.target.value)}
                  className={inputCls}
                  required
                />
              </Field>
              <Field label="Data Finalização">
                <input
                  type="date"
                  value={form["Dt Finalização"]}
                  onChange={(e) => setField("Dt Finalização", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Data Pagamento">
                <input
                  type="date"
                  value={form["Dt Pagamento"]}
                  onChange={(e) => setField("Dt Pagamento", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Status Pagamento (auto)">
                <input
                  value={statusPagamento}
                  readOnly
                  className={inputCls + " bg-slate-50 text-slate-500"}
                />
              </Field>

              <Field label="Situação (tarefa atual)" className="col-span-2">
                <select
                  value={form["Situação "]}
                  onChange={(e) => setField("Situação ", e.target.value)}
                  className={inputCls}
                >
                  {SITUACAO_OPCOES.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status Chamado">
                <select
                  value={form["Status Chamado"]}
                  onChange={(e) => setField("Status Chamado", e.target.value)}
                  className={inputCls}
                >
                  {STATUS_CHAMADO_OPCOES.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </Field>
              <Field label="SLA (auto, dias úteis)">
                <input
                  value={slaCalc || "—"}
                  readOnly
                  className={inputCls + " bg-slate-50 text-slate-500"}
                />
              </Field>
            </div>
          </section>

          {/* Responsáveis / motivo */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Responsáveis
              {precisaTranspConf && (
                <span className="ml-2 text-[10px] font-semibold text-blue-600 normal-case tracking-normal">
                  (obrigatório para {statusChamado})
                </span>
              )}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={`Transportadora ${precisaTranspConf ? "*" : ""}`}>
                <input
                  list="transportadoras-list"
                  value={form.Transportadora}
                  onChange={(e) =>
                    setField("Transportadora", e.target.value.toUpperCase().slice(0, 60))
                  }
                  maxLength={60}
                  className={inputCls}
                  placeholder="Digite ou selecione"
                />
                <datalist id="transportadoras-list">
                  {transportadoras.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </Field>
              <Field label={`Conferente ${precisaTranspConf ? "*" : ""}`}>
                <input
                  list="conferentes-list"
                  value={form.Conferente}
                  onChange={(e) =>
                    setField("Conferente", e.target.value.toUpperCase().slice(0, 60))

                  }
                  className={inputCls}
                  placeholder="Digite ou selecione"
                />
                <datalist id="conferentes-list">
                  {conferentes.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
              <Field
                label={`Motivo ${precisaMotivo ? "*" : ""}`}
                className="md:col-span-2"
              >
                <input
                  list="motivos-list"
                  value={form.Motivo}
                  onChange={(e) => setField("Motivo", e.target.value)}
                  className={inputCls}
                  placeholder={
                    precisaMotivo
                      ? "Obrigatório para chamados aprovados"
                      : "Digite ou selecione"
                  }
                />
                <datalist id="motivos-list">
                  {motivos.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </Field>
            </div>
          </section>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Incluir chamado
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  "w-full text-sm rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}
