import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle, Save, Plus, Trash2, Search, X, Pencil } from "lucide-react";

const fmtBR = (iso: string | null | undefined) => {
  if (!iso) return "";
  const s = String(iso).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
};
import { createChamadoCompleto, updateChamadoCompleto, getChamadoCompleto, listTarefas, deleteChamado } from "@/lib/chamados.functions";
import {
  listTransportadoras, listConferentes, listMotivos, searchProdutos,
} from "@/lib/cadastros.functions";
import { diasUteisEntre, parseISO, calcDataPrevista } from "@/lib/business-days";


const STATUS_CHAMADO_OPCOES = ["Pendente Monitoramento", "Aprovado", "Recusado"];
const SITUACAO_OPCOES = [
  "Aguardando monitoramento", "Aguardando NF Espelho", "Validação NF Espelho",
  "Aguardando NFD", "Emitir NFD", "Importação NF", "Dados Bancários",
  "Enviada Solicitação Provisionamento", "Pendente Provisionamento Financeiro",
  "Pagamento Provisionado", "Chamado Recusado", "Sem retorno (Finalizado)", "Finalizado",
];
const TIPO_OPCOES = ["Franquia", "Própria"];
const CD_OPCOES = ["ES", "PB"];

const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const primeiroDiaMesISO = (iso: string) => {
  const d = parseISO(iso);
  return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01` : "";
};
function calcularSLA(dtAbertura: string, dtFim: string) {
  const i = parseISO(dtAbertura); if (!i) return "";
  const f = parseISO(dtFim); if (!f) return "Em Aberto";
  return diasUteisEntre(i, f) <= 60 ? "Dentro do SLA" : "Fora do SLA";
}

type Referencia = { id?: string; referencia: string; cor: string; descricao: string; fornecedor: string; tamanho: string; quantidade: string };
type Etapa = { id?: string; tarefa_id: string | null; nome_tarefa: string; dias_uteis_previsto: number | null; dt_inicio: string; dt_fim: string };

type Props = {
  mode: "novo" | "editar";
  chamadoId?: string;
  initialChamado?: any;
  onSaved?: () => void;
  onCancel?: () => void;
  onDeleted?: () => void;
  compact?: boolean; // se true, sem cabeçalho externo (uso em modal)
};

export default function ChamadoForm({ mode: modeProp, chamadoId: chamadoIdProp, initialChamado, onSaved, onCancel, onDeleted, compact }: Props) {
  // Estado interno para transição automática de "novo" -> "editar" após primeiro save
  const [mode, setMode] = useState<"novo" | "editar">(modeProp);
  const [chamadoId, setChamadoId] = useState<string | undefined>(chamadoIdProp);
  useEffect(() => { setMode(modeProp); setChamadoId(chamadoIdProp); }, [modeProp, chamadoIdProp]);

  const createFn = useServerFn(createChamadoCompleto);
  const updateFn = useServerFn(updateChamadoCompleto);
  const getFn = useServerFn(getChamadoCompleto);
  const delFn = useServerFn(deleteChamado);

  const listTarefasFn = useServerFn(listTarefas);
  const listTFn = useServerFn(listTransportadoras);
  const listCFn = useServerFn(listConferentes);
  const listMFn = useServerFn(listMotivos);

  const [tab, setTab] = useState<"cadastro" | "referencias" | "etapas">("cadastro");
  const [tarefas, setTarefas] = useState<Array<{ id: string; nome: string; dias_uteis: number }>>([]);
  const [transp, setTransp] = useState<string[]>([]);
  const [confs, setConfs] = useState<string[]>([]);
  const [motivos, setMotivos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [loading, setLoading] = useState(mode === "editar");

  const [form, setForm] = useState<Record<string, string>>({
    Chamado: "", Loja: "", Tipo: "Franquia", NF: "",
    "Dt Emissão": "", CD: "ES", "Situação ": "Aguardando monitoramento",
    "Dt Abertura": hojeISO(), "Dt Finalização": "", "Dt Pagamento": "",
    "Status Chamado": "Pendente Monitoramento",
    Motivo: "", Transportadora: "", Conferente: "",
    _valor: "",
  });
  const [refs, setRefs] = useState<Referencia[]>([]);
  const [etapas, setEtapas] = useState<Etapa[]>([]);

  // Carrega listas + dados quando edita
  useEffect(() => {
    (async () => {
      try {
        const [ta, tr, cf, mo] = await Promise.all([
          listTarefasFn({ data: { tipo: "FALTAS" } }),
          listTFn(), listCFn(), listMFn(),
        ]);
        setTarefas((ta as any[]).map((t) => ({ id: t.id, nome: t.nome, dias_uteis: t.dias_uteis })));
        setTransp((tr as any[]).map((x) => x.nome));
        setConfs((cf as any[]).map((x) => x.nome));
        setMotivos((mo as any[]).map((x) => x.nome));
      } catch (e) { /* silent */ }
    })();
  }, []);

  useEffect(() => {
    if (mode !== "editar" || !chamadoId) return;
    (async () => {
      setLoading(true);
      try {
        const res: any = await getFn({ data: { id: chamadoId } });
        const c = res.chamado || {};
        setForm({
          Chamado: String(c.chamado ?? ""),
          Loja: String(c.loja ?? ""),
          Tipo: c.tipo || "Franquia",
          NF: String(c.nf ?? ""),
          "Dt Emissão": c.dt_emissao || "",
          CD: c.cd || "ES",
          "Situação ": c.situacao || "Aguardando monitoramento",
          "Dt Abertura": c.dt_abertura || "",
          "Dt Finalização": c.dt_finalizacao || "",
          "Dt Pagamento": c.dt_pagamento || "",
          "Status Chamado": c.status_chamado || "Pendente Monitoramento",
          Motivo: c.motivo || "",
          Transportadora: c.transportadora || "",
          Conferente: c.conferente || "",
          _valor: String(c.valor ?? ""),
        });
        setRefs((res.referencias || []).map((r: any) => ({
          id: r.id, referencia: r.referencia || "", cor: r.cor || "",
          descricao: r.descricao || "", fornecedor: r.fornecedor || "",
          tamanho: r.tamanho || "", quantidade: r.quantidade != null ? String(r.quantidade) : "",
        })));
        setEtapas((res.etapas || []).map((e: any) => ({
          id: e.id, tarefa_id: e.tarefa_id || null, nome_tarefa: e.nome_tarefa || "",
          dias_uteis_previsto: e.dias_uteis_previsto, dt_inicio: e.dt_inicio || "", dt_fim: e.dt_fim || "",
        })));
      } catch (e: any) {
        setFeedback({ type: "err", msg: e?.message || "Erro carregando chamado" });
      } finally { setLoading(false); }
    })();
  }, [chamadoId, mode]);

  // Inicial (novo) — se veio initialChamado, seed
  useEffect(() => {
    if (mode !== "novo" || !initialChamado) return;
    const maxCh = Math.max(0, ...([initialChamado].filter(Boolean).map((r: any) => Number(r.Chamado) || 0)));
    if (maxCh) setForm((p) => ({ ...p, Chamado: String(maxCh + 1) }));
  }, [mode, initialChamado]);

  const statusChamado = form["Status Chamado"];
  const precisaTranspConf = statusChamado === "Aprovado" || statusChamado === "Recusado";
  const precisaMotivo = statusChamado === "Aprovado";
  const statusPagamento = form["Dt Pagamento"] ? "Pago" : "Não Pago";
  const slaCalc = calcularSLA(form["Dt Abertura"], form["Dt Finalização"]);

  const setField = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const addRef = () => setRefs((p) => [...p, { referencia: "", cor: "", descricao: "", fornecedor: "", tamanho: "", quantidade: "" }]);
  const rmRef = (idx: number) => setRefs((p) => p.filter((_, i) => i !== idx));
  const setRef = (idx: number, patch: Partial<Referencia>) =>
    setRefs((p) => p.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const searchProdutosFn = useServerFn(searchProdutos);
  const buscarProduto = async (idx: number) => {
    const r = refs[idx]; if (!r?.referencia) return;
    try {
      const list: any[] = await searchProdutosFn({ data: { q: r.referencia } }) as any;
      const match = list.find(
        (p) => String(p.referencia).toLowerCase() === r.referencia.toLowerCase() && (!r.cor || String(p.cor).toLowerCase() === r.cor.toLowerCase())
      ) || list[0];
      if (match) {
        setRef(idx, {
          referencia: match.referencia,
          cor: r.cor || match.cor || "",
          descricao: match.descricao || "",
          fornecedor: match.nome_parceiro || "",
        });
      }
    } catch (e) { /* silent */ }
  };


  const addEtapa = () => setEtapas((p) => [...p, { tarefa_id: null, nome_tarefa: "", dias_uteis_previsto: null, dt_inicio: hojeISO(), dt_fim: "" }]);
  const rmEtapa = (idx: number) => setEtapas((p) => p.filter((_, i) => i !== idx));
  const setEt = (idx: number, patch: Partial<Etapa>) =>
    setEtapas((p) => p.map((e, i) => (i === idx ? { ...e, ...patch } : e)));

  // Regra: Situação (tarefa atual) = etapa em aberto (com início e sem finalização).
  // Se nenhuma em aberto, usa a última finalizada (maior dt_fim).
  useEffect(() => {
    if (!etapas.length) return;
    const abertas = etapas.filter((e) => e.dt_inicio && !e.dt_fim && e.nome_tarefa);
    let alvo = "";
    if (abertas.length) {
      const ord = [...abertas].sort((a, b) => (a.dt_inicio < b.dt_inicio ? 1 : -1));
      alvo = ord[0].nome_tarefa;
    } else {
      const finalizadas = etapas.filter((e) => e.dt_fim && e.nome_tarefa);
      if (finalizadas.length) {
        const ord = [...finalizadas].sort((a, b) => (a.dt_fim < b.dt_fim ? 1 : -1));
        alvo = ord[0].nome_tarefa;
      }
    }
    if (alvo && alvo !== form["Situação "]) {
      setForm((p) => ({ ...p, "Situação ": alvo }));
    }
  }, [etapas]);

  const validate = (): string | null => {
    if (!form.Chamado) return "Número do chamado é obrigatório";
    if (!form.Loja) return "Loja é obrigatória";
    if (!form["Dt Abertura"]) return "Data de abertura é obrigatória";
    if (precisaTranspConf && (!form.Transportadora || !form.Conferente))
      return "Transportadora e Conferente obrigatórios para Aprovado/Recusado";
    if (precisaMotivo && !form.Motivo) return "Motivo obrigatório para Aprovado";
    return null;
  };

  const submit = async (successMsg?: string) => {
    setFeedback(null);
    const err = validate();
    if (err) { setFeedback({ type: "err", msg: err }); return; }
    setSubmitting(true);
    const payload = {
      chamado: {
        Chamado: form.Chamado, Loja: form.Loja, Tipo: form.Tipo, NF: form.NF,
        "Dt Emissão": form["Dt Emissão"], " Valor ": form._valor,
        CD: form.CD, "Situação ": form["Situação "], "Dt Abertura": form["Dt Abertura"],
        "Dt Finalização": form["Dt Finalização"], "Dt Pagamento": form["Dt Pagamento"],
        "SLA por chamado (60dias)": slaCalc, "Status Pagamento": statusPagamento,
        "Status Chamado": form["Status Chamado"], Motivo: form.Motivo,
        Transportadora: form.Transportadora, Conferente: form.Conferente,
        Periodo: primeiroDiaMesISO(form["Dt Abertura"]),
      },
      referencias: refs.map((r) => ({
        referencia: r.referencia, cor: r.cor, descricao: r.descricao,
        fornecedor: r.fornecedor, tamanho: r.tamanho, quantidade: r.quantidade,
      })),
      etapas: etapas.map((e, i) => ({
        tarefa_id: e.tarefa_id, nome_tarefa: e.nome_tarefa,
        dias_uteis_previsto: e.dias_uteis_previsto, dt_inicio: e.dt_inicio || null,
        dt_fim: e.dt_fim || null, ordem: i + 1,
      })),
    };
    try {
      if (mode === "editar" && chamadoId) {
        await updateFn({ data: { id: chamadoId, ...payload } });
      } else {
        const res: any = await createFn({ data: payload });
        // Após criar, transiciona para modo edição para que próximas ações (add referência/etapa) atualizem o mesmo registro
        if (res?.id) {
          setChamadoId(res.id);
          setMode("editar");
        }
      }
      const msg = successMsg || (mode === "editar" ? "Chamado atualizado com sucesso." : "Chamado incluído com sucesso.");
      setFeedback({ type: "ok", msg });
      toast.success(msg);
      onSaved?.();
    } catch (e: any) {
      const msg = e?.message || "Erro ao salvar";
      setFeedback({ type: "err", msg });
      toast.error(msg);
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center p-10 text-slate-500"><Loader2 className="w-5 h-5 animate-spin mr-2"/>Carregando...</div>;

  return (
    <div className={compact ? "" : "flex-1 overflow-auto bg-slate-50 p-4"}>
      <div className={compact ? "" : "w-full"}>
        {!compact && (
          <header className="mb-4">
            <h1 className="text-xl font-bold text-slate-800">
              {mode === "editar" ? `Editar Chamado nº ${form.Chamado}` : "Novo Chamado — Faltas"}
            </h1>
          </header>
        )}

        {feedback && (
          <div className={`mb-3 flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${feedback.type === "ok" ? "border-green-300 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}>
            {feedback.type === "ok" ? <CheckCircle2 className="w-4 h-4 mt-0.5"/> : <AlertCircle className="w-4 h-4 mt-0.5"/>}
            <span>{feedback.msg}</span>
            <button onClick={() => setFeedback(null)} className="ml-auto text-xs opacity-60">✕</button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex border-b border-slate-200">
            {[
              { k: "cadastro", label: "Cadastro" },
              { k: "referencias", label: `Referências (${refs.length})` },
              { k: "etapas", label: `Etapas (${etapas.length})` },
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setTab(t.k as any)}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab === t.k ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
              >{t.label}</button>
            ))}
          </div>

          <div className="p-5">
            {tab === "cadastro" && (
              <CadastroTab form={form} setField={setField} statusPagamento={statusPagamento} sla={slaCalc}
                transp={transp} confs={confs} motivos={motivos} precisaTranspConf={precisaTranspConf} precisaMotivo={precisaMotivo}
                statusChamado={statusChamado}
              />
            )}
            {tab === "referencias" && (
              <ReferenciasTab refs={refs} setRef={setRef} addRef={addRef} rmRef={rmRef} buscar={buscarProduto}
                onSalvar={() => submit("Referência salva com sucesso.")} salvando={submitting} />
            )}
            {tab === "etapas" && (
              <EtapasTab etapas={etapas} setEt={setEt} addEtapa={addEtapa} rmEtapa={rmEtapa} tarefas={tarefas}
                onSalvar={() => submit("Etapa salva com sucesso.")} salvando={submitting} />
            )}
          </div>

          {tab === "cadastro" && (
            <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-slate-100">
              <div>
                {mode === "editar" && chamadoId && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm("Excluir este chamado? Esta ação não pode ser desfeita.")) return;
                      try {
                        await delFn({ data: { ids: [chamadoId] } });
                        toast.success("Chamado excluído.");
                        onDeleted?.();
                      } catch (e: any) { toast.error(e?.message || "Erro ao excluir"); }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
                  >
                    <Trash2 className="w-4 h-4"/>Excluir chamado
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {onCancel && <button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900">Cancelar</button>}
                <button
                  type="button" onClick={() => submit()} disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                  {mode === "editar" ? "Salvar alterações" : "Incluir chamado"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full text-sm rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

function Field({ label, children, className = "", style }: { label: string; children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`} style={style}>
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}


function CadastroTab({ form, setField, statusPagamento, sla, transp, confs, motivos, precisaTranspConf, precisaMotivo, statusChamado }: any) {
  return (
    <div className="space-y-5">
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Identificação</h2>
        <div className="flex flex-wrap gap-3">
          <Field label="Chamado *" style={{ width: "120px" }}><input type="number" value={form.Chamado} onChange={(e) => setField("Chamado", e.target.value.slice(0, 8))} className={inputCls} required /></Field>
          <Field label="Loja *" style={{ width: "90px" }}><input type="number" value={form.Loja} onChange={(e) => setField("Loja", e.target.value.slice(0, 5))} className={inputCls} required /></Field>
          <Field label="Tipo" style={{ width: "130px" }}><select value={form.Tipo} onChange={(e) => setField("Tipo", e.target.value)} className={inputCls}>{TIPO_OPCOES.map((o) => <option key={o}>{o}</option>)}</select></Field>
          <Field label="CD" style={{ width: "90px" }}><select value={form.CD} onChange={(e) => setField("CD", e.target.value)} className={inputCls}>{CD_OPCOES.map((o) => <option key={o}>{o}</option>)}</select></Field>
          <Field label="NF" style={{ width: "140px" }}><input type="number" value={form.NF} onChange={(e) => setField("NF", e.target.value.slice(0, 10))} className={inputCls} /></Field>
          <Field label="Data Emissão" style={{ width: "160px" }}><input type="date" value={form["Dt Emissão"]} onChange={(e) => setField("Dt Emissão", e.target.value)} className={inputCls} /></Field>
          <Field label="Valor" style={{ width: "160px" }}><input type="number" step="0.01" value={form._valor} onChange={(e) => setField("_valor", e.target.value.slice(0, 14))} className={inputCls} /></Field>
        </div>
      </section>
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Status e Datas</h2>
        <div className="flex flex-wrap gap-3">
          <Field label="Data Abertura *" style={{ width: "160px" }}><input type="date" value={form["Dt Abertura"]} onChange={(e) => setField("Dt Abertura", e.target.value)} className={inputCls} required /></Field>
          <Field label="Data Finalização" style={{ width: "160px" }}><input type="date" value={form["Dt Finalização"]} onChange={(e) => setField("Dt Finalização", e.target.value)} className={inputCls} /></Field>
          <Field label="Data Pagamento" style={{ width: "160px" }}><input type="date" value={form["Dt Pagamento"]} onChange={(e) => setField("Dt Pagamento", e.target.value)} className={inputCls} /></Field>
          <Field label="Status Pagamento (auto)" style={{ width: "170px" }}><input value={statusPagamento} readOnly className={inputCls + " bg-slate-50 text-slate-500"} /></Field>
          <Field label="Situação (tarefa atual)" style={{ minWidth: "260px", flex: "1 1 260px" }}>
            <select value={form["Situação "]} onChange={(e) => setField("Situação ", e.target.value)} className={inputCls}>{SITUACAO_OPCOES.map((o) => <option key={o}>{o}</option>)}</select>
          </Field>
          <Field label="Status Chamado" style={{ width: "210px" }}>
            <select value={form["Status Chamado"]} onChange={(e) => setField("Status Chamado", e.target.value)} className={inputCls}>{STATUS_CHAMADO_OPCOES.map((o) => <option key={o}>{o}</option>)}</select>
          </Field>
          <Field label="SLA (auto, dias úteis)" style={{ width: "160px" }}><input value={sla || "—"} readOnly className={inputCls + " bg-slate-50 text-slate-500"} /></Field>
        </div>
      </section>
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Responsáveis {precisaTranspConf && <span className="ml-2 text-[10px] text-blue-600 normal-case">(obrigatório para {statusChamado})</span>}
        </h2>
        <div className="flex flex-wrap gap-3">
          <Field label={`Transportadora ${precisaTranspConf ? "*" : ""}`} style={{ minWidth: "240px", flex: "1 1 240px" }}>
            <input list="transp-list-form" value={form.Transportadora} onChange={(e) => setField("Transportadora", e.target.value.toUpperCase().slice(0, 60))} className={inputCls} />
            <datalist id="transp-list-form">{transp.map((t: string) => <option key={t} value={t} />)}</datalist>
          </Field>
          <Field label={`Conferente ${precisaTranspConf ? "*" : ""}`} style={{ minWidth: "240px", flex: "1 1 240px" }}>
            <input list="conf-list-form" value={form.Conferente} onChange={(e) => setField("Conferente", e.target.value.toUpperCase().slice(0, 60))} className={inputCls} />
            <datalist id="conf-list-form">{confs.map((c: string) => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label={`Motivo ${precisaMotivo ? "*" : ""}`} style={{ minWidth: "320px", flex: "2 1 320px" }}>
            <input list="mot-list-form" value={form.Motivo} onChange={(e) => setField("Motivo", e.target.value.slice(0, 200))} className={inputCls} />
            <datalist id="mot-list-form">{motivos.map((m: string) => <option key={m} value={m} />)}</datalist>
          </Field>
        </div>
      </section>
    </div>
  );
}


function ItemEditModal({ title, onClose, onAdd, children }: { title: string; onClose: () => void; onAdd?: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-4">{children}</div>
        <div className="flex justify-between items-center px-4 py-3 border-t bg-slate-50">
          {onAdd ? (
            <button onClick={() => { onAdd(); onClose(); }} className="inline-flex items-center gap-1 px-3 py-2 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md">
              <Plus className="w-4 h-4"/>Adicionar novo
            </button>
          ) : <span/>}
          <button onClick={onClose} className="inline-flex items-center gap-1 px-3 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md"><Save className="w-4 h-4"/>Concluir</button>
        </div>
      </div>
    </div>
  );
}

function ReferenciasTab({ refs, setRef, addRef, rmRef, buscar, onSalvar, salvando }: any) {
  const [editIdx, setEditIdx] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-slate-500">Adicione uma ou mais referências. Digite a referência e clique em buscar para auto-preencher descrição e fornecedor.</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={addRef} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md">
            <Plus className="w-3.5 h-3.5"/>Adicionar
          </button>
          <button type="button" onClick={onSalvar} disabled={salvando} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50">
            {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Save className="w-3.5 h-3.5"/>}Salvar
          </button>
        </div>
      </div>
      {refs.length === 0 && <div className="text-center py-8 text-slate-400 text-sm border border-dashed rounded-lg">Nenhuma referência ainda.</div>}
      <div className="space-y-2">
        {refs.map((r: Referencia, idx: number) => (
          <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 border border-slate-200 rounded-lg bg-slate-50/50">
            <Field label="Referência" className="col-span-3">
              <div className="flex gap-1">
                <input value={r.referencia} onChange={(e) => setRef(idx, { referencia: e.target.value })} className={inputCls} />
                <button type="button" onClick={() => buscar(idx)} title="Buscar produto" className="px-2 border border-slate-300 rounded-md hover:bg-slate-100"><Search className="w-4 h-4 text-slate-600"/></button>
              </div>
            </Field>
            <Field label="Cor" className="col-span-2"><input value={r.cor} onChange={(e) => setRef(idx, { cor: e.target.value })} className={inputCls} /></Field>
            <Field label="Descrição" className="col-span-3"><input value={r.descricao} onChange={(e) => setRef(idx, { descricao: e.target.value })} className={inputCls} /></Field>
            <Field label="Fornecedor" className="col-span-2"><input value={r.fornecedor} onChange={(e) => setRef(idx, { fornecedor: e.target.value })} className={inputCls} /></Field>
            <Field label="Tam."><input value={r.tamanho} onChange={(e) => setRef(idx, { tamanho: e.target.value })} className={inputCls} /></Field>
            <div className="flex items-center gap-1">
              <Field label="Qtd"><input type="number" value={r.quantidade} onChange={(e) => setRef(idx, { quantidade: e.target.value })} className={inputCls} /></Field>
              <button type="button" onClick={() => setEditIdx(idx)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-md mb-0.5" title="Editar"><Pencil className="w-4 h-4"/></button>
              <button type="button" onClick={() => rmRef(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-md mb-0.5" title="Remover"><Trash2 className="w-4 h-4"/></button>
            </div>
          </div>
        ))}
      </div>
      {editIdx != null && refs[editIdx] && (
        <ItemEditModal title={`Editar referência ${refs[editIdx].referencia || `#${editIdx + 1}`}`} onClose={() => setEditIdx(null)} onAdd={addRef}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Referência"><input value={refs[editIdx].referencia} onChange={(e) => setRef(editIdx, { referencia: e.target.value })} className={inputCls}/></Field>
            <Field label="Cor"><input value={refs[editIdx].cor} onChange={(e) => setRef(editIdx, { cor: e.target.value })} className={inputCls}/></Field>
            <Field label="Descrição" className="col-span-2"><input value={refs[editIdx].descricao} onChange={(e) => setRef(editIdx, { descricao: e.target.value })} className={inputCls}/></Field>
            <Field label="Fornecedor" className="col-span-2"><input value={refs[editIdx].fornecedor} onChange={(e) => setRef(editIdx, { fornecedor: e.target.value })} className={inputCls}/></Field>
            <Field label="Tamanho"><input value={refs[editIdx].tamanho} onChange={(e) => setRef(editIdx, { tamanho: e.target.value })} className={inputCls}/></Field>
            <Field label="Quantidade"><input type="number" value={refs[editIdx].quantidade} onChange={(e) => setRef(editIdx, { quantidade: e.target.value })} className={inputCls}/></Field>
          </div>
        </ItemEditModal>
      )}
    </div>
  );
}

function EtapasTab({ etapas, setEt, addEtapa, rmEtapa, tarefas, onSalvar, salvando }: any) {
  const [editIdx, setEditIdx] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-slate-500">Etapas do fluxo. Data prevista e SLA são calculados automaticamente em dias úteis.</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={addEtapa} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md">
            <Plus className="w-3.5 h-3.5"/>Adicionar
          </button>
          <button type="button" onClick={onSalvar} disabled={salvando} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50">
            {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Save className="w-3.5 h-3.5"/>}Salvar
          </button>
        </div>
      </div>
      {etapas.length === 0 && <div className="text-center py-8 text-slate-400 text-sm border border-dashed rounded-lg">Nenhuma etapa ainda.</div>}
      <div className="space-y-2">
        {etapas.map((e: Etapa, idx: number) => {
          const dtPrev = calcDataPrevista(e.dt_inicio, e.dias_uteis_previsto);
          const ini = parseISO(e.dt_inicio); const fim = parseISO(e.dt_fim);
          const diasReal = ini && fim ? diasUteisEntre(ini, fim) : null;
          let sla: { texto: string; cor: string } | null = null;
          if (ini && fim && e.dias_uteis_previsto != null) {
            const ok = (diasReal ?? 0) <= e.dias_uteis_previsto;
            sla = { texto: ok ? `Dentro (${diasReal}d)` : `Atrasado (${diasReal}d)`, cor: ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700" };
          } else if (ini && !fim) sla = { texto: "Em aberto", cor: "bg-amber-100 text-amber-700" };
          return (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 border border-slate-200 rounded-lg bg-slate-50/50">
              <Field label="Tarefa *" className="col-span-4">
                <select
                  value={e.nome_tarefa || ""}
                  onChange={(ev) => {
                    const nome = ev.target.value;
                    const t = tarefas.find((x: any) => x.nome === nome);
                    setEt(idx, { tarefa_id: t?.id || null, nome_tarefa: nome, dias_uteis_previsto: t?.dias_uteis ?? e.dias_uteis_previsto ?? 1 });
                  }}
                  className={inputCls}
                >
                  <option value="">— Selecionar —</option>
                  {tarefas.map((t: any) => <option key={t.id} value={t.nome}>{t.nome}</option>)}
                </select>
              </Field>
              <Field label="SLA (dias)" className="col-span-1"><input type="number" min={0} value={e.dias_uteis_previsto ?? ""} onChange={(ev) => setEt(idx, { dias_uteis_previsto: ev.target.value === "" ? null : Number(ev.target.value) })} className={inputCls} /></Field>
              <Field label="Início" className="col-span-2"><input type="date" value={e.dt_inicio} onChange={(ev) => setEt(idx, { dt_inicio: ev.target.value })} className={inputCls} /></Field>
              <Field label="Previsto" className="col-span-2"><input value={fmtBR(dtPrev) || "—"} readOnly className={inputCls + " bg-slate-50 text-slate-500"} /></Field>
              <Field label="Finalizado" className="col-span-2"><input type="date" value={e.dt_fim} onChange={(ev) => setEt(idx, { dt_fim: ev.target.value })} className={inputCls} /></Field>
              <div className="col-span-1 flex items-center gap-1">
                {sla && <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${sla.cor}`}>{sla.texto}</span>}
                <button type="button" onClick={() => setEditIdx(idx)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-md" title="Editar"><Pencil className="w-4 h-4"/></button>
                <button type="button" onClick={() => rmEtapa(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-md" title="Remover"><Trash2 className="w-4 h-4"/></button>
              </div>
            </div>
          );
        })}
      </div>
      {editIdx != null && etapas[editIdx] && (
        <ItemEditModal title={`Editar etapa ${etapas[editIdx].nome_tarefa || `#${editIdx + 1}`}`} onClose={() => setEditIdx(null)} onAdd={addEtapa}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tarefa" className="col-span-2">
              <select
                value={etapas[editIdx].nome_tarefa || ""}
                onChange={(ev) => {
                  const nome = ev.target.value;
                  const t = tarefas.find((x: any) => x.nome === nome);
                  setEt(editIdx, { tarefa_id: t?.id || null, nome_tarefa: nome, dias_uteis_previsto: t?.dias_uteis ?? etapas[editIdx].dias_uteis_previsto ?? 1 });
                }}
                className={inputCls}
              >
                <option value="">— Selecionar —</option>
                {tarefas.map((t: any) => <option key={t.id} value={t.nome}>{t.nome}</option>)}
              </select>
            </Field>
            <Field label="SLA (dias úteis)"><input type="number" min={0} value={etapas[editIdx].dias_uteis_previsto ?? ""} onChange={(ev) => setEt(editIdx, { dias_uteis_previsto: ev.target.value === "" ? null : Number(ev.target.value) })} className={inputCls}/></Field>
            <Field label="Data prevista"><input value={fmtBR(calcDataPrevista(etapas[editIdx].dt_inicio, etapas[editIdx].dias_uteis_previsto)) || "—"} readOnly className={inputCls + " bg-slate-50 text-slate-500"}/></Field>
            <Field label="Início"><input type="date" value={etapas[editIdx].dt_inicio} onChange={(ev) => setEt(editIdx, { dt_inicio: ev.target.value })} className={inputCls}/></Field>
            <Field label="Finalizado"><input type="date" value={etapas[editIdx].dt_fim} onChange={(ev) => setEt(editIdx, { dt_fim: ev.target.value })} className={inputCls}/></Field>
          </div>
        </ItemEditModal>
      )}
    </div>
  );
}
