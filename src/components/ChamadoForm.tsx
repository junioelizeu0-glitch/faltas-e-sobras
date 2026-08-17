import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle, Save, Plus, Trash2, Search, X, Pencil, ClipboardCheck, FileText } from "lucide-react";

const fmtBR = (iso: string | null | undefined) => {
  if (!iso) return "";
  const s = String(iso).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
};
import { createChamadoCompleto, updateChamadoCompleto, getChamadoCompleto, listTarefas, deleteChamado } from "@/lib/chamados.functions";
import {
  listTransportadoras, listConferentes, listMotivos, searchProdutos,
  upsertTransportadora, deleteTransportadora,
  upsertConferente, deleteConferente,
  upsertMotivo, deleteMotivo,
} from "@/lib/cadastros.functions";
import { getLojaByNumero, type Loja } from "@/lib/lojas.functions";
import { diasUteisEntre, parseISO, calcDataPrevista } from "@/lib/business-days";
import CadastroSimples from "./CadastroSimples";
import CadastroLojas from "./CadastroLojas";
import Combobox from "./Combobox";


const STATUS_CHAMADO_OPCOES = ["Pendente Monitoramento", "Aprovado", "Recusado"];
const SITUACAO_OPCOES = [
  "Aguardando monitoramento", "Chamado Aprovado", "Finalizar Chamado",
  "Aguardando NF Espelho", "Validação NF Espelho",
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
  onClose?: () => void;
  onDeleted?: () => void;
  compact?: boolean; // se true, sem cabeçalho externo (uso em modal)
};

export default function ChamadoForm({ mode: modeProp, chamadoId: chamadoIdProp, initialChamado, onSaved, onCancel, onClose, onDeleted, compact }: Props) {
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
  const [manage, setManage] = useState<null | "transp" | "conf" | "motivo">(null);
  const [lojaOpen, setLojaOpen] = useState(false);
  const [lojaInfo, setLojaInfo] = useState<Loja | null>(null);
  const getLojaFn = useServerFn(getLojaByNumero);

  const [form, setForm] = useState<Record<string, string>>(() => ({
    Chamado: initialChamado?.Chamado ? String(initialChamado.Chamado) : "", Loja: "", Tipo: "", NF: "",
    "Dt Emissão": "", CD: "ES", "Situação ": "Aguardando monitoramento",
    "Dt Abertura": hojeISO(), "Dt Finalização": "", "Dt Pagamento": "",
    "Status Chamado": "Pendente Monitoramento",
    Motivo: "", Transportadora: "", Conferente: "",
    _valor: "",
  }));

  const [refs, setRefs] = useState<Referencia[]>([]);
  const [etapas, setEtapas] = useState<Etapa[]>([]);

  // Carrega listas + dados quando edita
  const loadListas = async () => {
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
  };
  useEffect(() => { loadListas(); }, []);

  const prevStatusRef = useRef<string>("");

  useEffect(() => {
    if (mode !== "editar" || !chamadoId) return;
    (async () => {
      setLoading(true);
      try {
        const res: any = await getFn({ data: { id: chamadoId } });
        const c = res.chamado || {};
        // Sincroniza a ref ANTES do setForm para evitar que o auto-fill de status
        // sobrescreva a Situação carregada do banco.
        prevStatusRef.current = c.status_chamado || "";
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

  // Auto-fill: quando novo chamado + Dt Abertura preenchida, sugere Situação/Status para o primeiro registro.
  useEffect(() => {
    if (mode !== "novo") return;
    if (!form["Dt Abertura"]) return;
    setForm((p) => {
      const patch: Record<string, string> = {};
      if (!p["Situação "]) patch["Situação "] = "Aguardando monitoramento";
      if (!p["Status Chamado"]) patch["Status Chamado"] = "Pendente Monitoramento";
      return Object.keys(patch).length ? { ...p, ...patch } : p;
    });
  }, [form["Dt Abertura"], mode]);

  // Auto-fill Situação SOMENTE quando o usuário alterar Status Chamado (transição real),
  // não na hidratação inicial nem quando só o Tipo muda.
  useEffect(() => {
    const s = form["Status Chamado"];
    if (s === prevStatusRef.current) return;
    const anterior = prevStatusRef.current;
    prevStatusRef.current = s;
    if (!anterior) return; // primeira definição (hidratação) — não altera Situação
    if (s === "Recusado") {
      setForm((p) => ({ ...p, "Situação ": "Chamado Recusado" }));
    } else if (s === "Aprovado") {
      const nova = form.Tipo === "Franquia" ? "Aguardando NF Espelho" : "Emitir NFD";
      setForm((p) => ({ ...p, "Situação ": nova }));
    }
  }, [form["Status Chamado"]]);

  // Auto-preencher Situação como "Finalizado" quando Data Finalização for informada.
  useEffect(() => {
    if (!form["Dt Finalização"]) return;
    const atual = (form["Situação "] || "").toLowerCase();
    if (atual === "finalizado" || atual === "chamado recusado" || atual === "sem retorno (finalizado)") return;
    setForm((p) => ({ ...p, "Situação ": "Finalizado" }));
  }, [form["Dt Finalização"]]);



  // Sugestão de número do chamado quando initialChamado muda ou em modo novo
  useEffect(() => {
    if (mode === "novo" && initialChamado?.Chamado && !form.Chamado) {
      setForm((p) => ({ ...p, Chamado: String(initialChamado.Chamado) }));
    }
  }, [initialChamado, mode]);

  // Busca dados da loja e auto-preenche a Franquia (Tipo) caso exista no cadastro
  useEffect(() => {
    const numero = String(form.Loja || "").trim();
    if (!numero) { setLojaInfo(null); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await getLojaFn({ data: { numero } });
        if (!cancelled) {
          const loja = (r as Loja | null) || null;
          setLojaInfo(loja);
          if (loja && loja.tipo) {
            // Regra: Puxa o Tipo (Franquia / Própria) automaticamente do Cadastro de Lojas
            setForm((p) => (p.Tipo !== loja.tipo ? { ...p, Tipo: loja.tipo || p.Tipo } : p));
          }
        }
      } catch { if (!cancelled) setLojaInfo(null); }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [form.Loja, lojaOpen]);



  const statusChamado = form["Status Chamado"];
  const precisaTranspConf = statusChamado === "Aprovado" || statusChamado === "Recusado";
  const precisaMotivo = statusChamado === "Aprovado";
  const precisaDadosNF = useMemo(
    () => (etapas || []).some((e) => /importa[çc][ãa]o\s*nf/i.test(e.nome_tarefa || "")),
    [etapas]
  );
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


  // partial=true (salvar em ref/etapas isoladamente) não exige refs/etapas populadas.
  const validate = (partial = false): string | null => {
    if (!form.Chamado) return "Número do chamado é obrigatório";
    if (!form.Loja) return "Loja é obrigatória";
    if (!form.Tipo) return "Tipo é obrigatório";
    if (!form.CD) return "CD é obrigatório";
    if (!form["Status Chamado"]) return "Status do chamado é obrigatório";
    if (!form["Situação "]) return "Situação (tarefa atual) é obrigatória";
    if (!form["Dt Abertura"]) return "Data de abertura é obrigatória";
    if (!partial) {
      const refsOk = (refs || []).some((r) => (r.referencia || "").trim() !== "");
      if (!refsOk) return "Inclua ao menos uma Referência (aba Referências)";
      const etapasOk = (etapas || []).some((e) => (e.nome_tarefa || "").trim() !== "");
      if (!etapasOk) return "Inclua ao menos uma Etapa (aba Etapas)";
    }
    if (precisaTranspConf && (!form.Transportadora || !form.Conferente))
      return "Preencha Transportadora e Conferente antes de salvar (obrigatórios para " + statusChamado + ").";
    if (precisaMotivo && !form.Motivo) return "Preencha o Motivo antes de salvar (obrigatório para Aprovado).";
    if (podeMonitorar && (!form.Transportadora?.trim() || !form.Conferente?.trim() || !form.Motivo?.trim())) {
      const faltantes: string[] = [];
      if (!form.Transportadora?.trim()) faltantes.push("Transportadora");
      if (!form.Conferente?.trim()) faltantes.push("Conferente");
      if (!form.Motivo?.trim()) faltantes.push("Motivo");
      return `Para registrar o resultado do monitoramento, é obrigatório preencher: ${faltantes.join(", ")}.`;
    }
    if (precisaDadosNF) {
      const faltando: string[] = [];
      if (!form.NF) faltando.push("Nº NF");
      if (!form._valor) faltando.push("Valor");
      if (!form["Dt Emissão"]) faltando.push("Data Emissão");
      if (faltando.length) return `Etapa "Importação NF" exige: ${faltando.join(", ")}.`;
    }
    const sit = (form["Situação "] || "").toLowerCase();
    if ((/chamado recusado/.test(sit) || /finaliz/.test(sit)) && !form["Dt Finalização"]) {
      return `Preencha a Data de Finalização (obrigatória quando a situação é "${form["Situação "]}").`;
    }
    return null;
  };


  const submit = async (successMsg?: string, opts?: { partial?: boolean }) => {
    setFeedback(null);
    const err = validate(!!opts?.partial);
    if (err) { setFeedback({ type: "err", msg: err }); toast.error(err); return; }
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
      const isEdit = mode === "editar" && chamadoId;
      if (isEdit) {
        await updateFn({ data: { id: chamadoId!, ...payload } });
      } else {
        const res: any = await createFn({ data: payload });
        if (res?.id) { setChamadoId(res.id); setMode("editar"); }
      }
      const msg = successMsg || (isEdit ? "Chamado salvo" : "Chamado incluído");
      setFeedback({ type: "ok", msg });
      toast.success(msg);
      onSaved?.();
    } catch (e: any) {
      const msg = e?.message || "Erro ao salvar chamado";
      setFeedback({ type: "err", msg });
      toast.error(msg);
    } finally { setSubmitting(false); }
  };

  const primaryLabel = mode === "editar" ? "Salvar alterações" : "Incluir chamado";

  // Função para reiniciar e preparar para inclusão de novo chamado
  const handleResetParaNovo = () => {
    if (form.Chamado || form.Loja) {
      if (!confirm("Deseja iniciar um novo chamado? Os dados preenchidos da tela atual serão limpos.")) {
        return;
      }
    }
    const proxNum = initialChamado?.Chamado ? String(initialChamado.Chamado) : "";
    setMode("novo");
    setChamadoId(undefined);
    setForm({
      Chamado: proxNum, Loja: "", Tipo: "", NF: "",
      "Dt Emissão": "", CD: "ES", "Situação ": "Aguardando monitoramento",
      "Dt Abertura": hojeISO(), "Dt Finalização": "", "Dt Pagamento": "",
      "Status Chamado": "Pendente Monitoramento",
      Motivo: "", Transportadora: "", Conferente: "",
      _valor: "",
    });
    setRefs([]);
    setEtapas([]);
    setFeedback({ type: "ok", msg: "Formulário pronto para incluir um novo chamado." });
    setTab("cadastro");
    toast.info("Formulário pronto para novo chamado");
  };

  // ============ Resultado do Monitoramento ============
  const [monitorAsk, setMonitorAsk] = useState(false);
  const podeMonitorar =
    mode === "editar" &&
    (form["Status Chamado"] === "Pendente Monitoramento" ||
      /monitoramento/i.test(form["Situação "] || ""));

  const handleOpenMonitorAsk = () => {
    const faltantes: string[] = [];
    if (!form.Transportadora?.trim()) faltantes.push("Transportadora");
    if (!form.Conferente?.trim()) faltantes.push("Conferente");
    if (!form.Motivo?.trim()) faltantes.push("Motivo");

    if (faltantes.length > 0) {
      const msg = `Para registrar o resultado do monitoramento, é obrigatório preencher: ${faltantes.join(", ")}.`;
      setFeedback({ type: "err", msg });
      toast.error(msg);
      return;
    }
    setMonitorAsk(true);
  };

  const aplicarResultadoMonitoramento = async (aprovado: boolean) => {
    const faltantes: string[] = [];
    if (!form.Transportadora?.trim()) faltantes.push("Transportadora");
    if (!form.Conferente?.trim()) faltantes.push("Conferente");
    if (!form.Motivo?.trim()) faltantes.push("Motivo");

    if (faltantes.length > 0) {
      const msg = `Para registrar o resultado do monitoramento, é obrigatório preencher: ${faltantes.join(", ")}.`;
      setFeedback({ type: "err", msg });
      toast.error(msg);
      return;
    }

    setMonitorAsk(false);
    const hoje = hojeISO();
    const novaTarefaNome = aprovado ? "Chamado Aprovado" : "Finalizar Chamado";
    const novoStatus = aprovado ? "Aprovado" : "Recusado";

    // Encerra etapa de monitoramento em aberto e adiciona a nova
    const etapasAtualizadas = etapas.map((e) =>
      !e.dt_fim && /monitoramento/i.test(e.nome_tarefa || "") ? { ...e, dt_fim: hoje } : e
    );
    const t = tarefas.find((x) => x.nome.toLowerCase() === novaTarefaNome.toLowerCase());
    const novasEtapas: Etapa[] = [
      ...etapasAtualizadas,
      { tarefa_id: t?.id || null, nome_tarefa: novaTarefaNome, dias_uteis_previsto: t?.dias_uteis ?? 1, dt_inicio: hoje, dt_fim: "" },
    ];

    // Atualiza estado (para UI) e envia diretamente ao banco com os novos valores
    prevStatusRef.current = novoStatus;
    setForm((p) => ({ ...p, "Status Chamado": novoStatus, "Situação ": novaTarefaNome }));
    setEtapas(novasEtapas);

    setSubmitting(true);
    try {
      const payload = {
        chamado: {
          Chamado: form.Chamado, Loja: form.Loja, Tipo: form.Tipo, NF: form.NF,
          "Dt Emissão": form["Dt Emissão"], " Valor ": form._valor,
          CD: form.CD, "Situação ": novaTarefaNome, "Dt Abertura": form["Dt Abertura"],
          "Dt Finalização": form["Dt Finalização"], "Dt Pagamento": form["Dt Pagamento"],
          "SLA por chamado (60dias)": slaCalc, "Status Pagamento": statusPagamento,
          "Status Chamado": novoStatus, Motivo: form.Motivo,
          Transportadora: form.Transportadora, Conferente: form.Conferente,
          Periodo: primeiroDiaMesISO(form["Dt Abertura"]),
        },
        referencias: refs.map((r) => ({
          referencia: r.referencia, cor: r.cor, descricao: r.descricao,
          fornecedor: r.fornecedor, tamanho: r.tamanho, quantidade: r.quantidade,
        })),
        etapas: novasEtapas.map((e, i) => ({
          tarefa_id: e.tarefa_id, nome_tarefa: e.nome_tarefa,
          dias_uteis_previsto: e.dias_uteis_previsto, dt_inicio: e.dt_inicio || null,
          dt_fim: e.dt_fim || null, ordem: i + 1,
        })),
      };
      if (mode === "editar" && chamadoId) {
        await updateFn({ data: { id: chamadoId, ...payload } });
      } else {
        const res: any = await createFn({ data: payload });
        if (res?.id) { setChamadoId(res.id); setMode("editar"); }
      }
      toast.success(aprovado ? "Falta aprovada" : "Falta recusada");
      onSaved?.();
      if (onCancel) onCancel();
      else if (onClose) onClose();
    } catch (e: any) {
      const msg = e?.message || "Erro ao salvar resultado";
      setFeedback({ type: "err", msg });
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };


  if (loading) return <div className="flex items-center justify-center p-10 text-slate-500"><Loader2 className="w-5 h-5 animate-spin mr-2"/>Carregando...</div>;

  return (
    <div className={compact ? "h-full flex flex-col" : "flex-1 overflow-auto bg-slate-50 p-4"}>
      <div className={compact ? "h-full flex flex-col" : "w-full min-h-full"}>
        {!compact ? (
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                {mode === "editar" ? `Editar Chamado nº ${form.Chamado}` : "Novo Chamado — Faltas"}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {mode === "editar" ? "Altere ou consulte as informações do chamado" : "Preencha os dados abaixo para registrar um novo chamado"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetParaNovo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl transition-all shadow-xs cursor-pointer"
                title="Iniciar o cadastro de um novo chamado"
              >
                <Plus className="w-3.5 h-3.5" />
                Incluir Novo Chamado
              </button>

              {(onCancel || onClose) && (
                <button
                  type="button"
                  onClick={() => (onCancel ? onCancel() : onClose?.())}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                  title="Fechar aba (X)"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </header>
        ) : (
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              type="button"
              onClick={handleResetParaNovo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl transition-all shadow-xs cursor-pointer"
              title="Iniciar o cadastro de um novo chamado"
            >
              <Plus className="w-3.5 h-3.5" />
              Incluir Novo Chamado
            </button>
          </div>
        )}

        {feedback && (
          <div className={`mb-3 flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${feedback.type === "ok" ? "border-green-300 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}>
            {feedback.type === "ok" ? <CheckCircle2 className="w-4 h-4 mt-0.5"/> : <AlertCircle className="w-4 h-4 mt-0.5"/>}
            <span>{feedback.msg}</span>
            <button onClick={() => setFeedback(null)} className="ml-auto text-xs opacity-60">✕</button>
          </div>
        )}

        <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${compact ? "h-full flex flex-col" : "min-h-[calc(100vh-180px)]"}`}>
          <div className="sticky top-0 z-20 flex border-b border-slate-200 bg-white/95 backdrop-blur rounded-t-xl">
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

          <div className={`p-5 ${compact ? "flex-1 flex flex-col min-h-0" : ""}`}>
            {tab === "cadastro" && (
              <CadastroTab form={form} setField={setField} statusPagamento={statusPagamento} sla={slaCalc}
                transp={transp} confs={confs} motivos={motivos} precisaTranspConf={precisaTranspConf} precisaMotivo={precisaMotivo}
                statusChamado={statusChamado} onManage={setManage}
                lojaInfo={lojaInfo} onEditLoja={() => setLojaOpen(true)}
              />
            )}
            {tab === "referencias" && (
              <ReferenciasTab refs={refs} setRef={setRef} addRef={addRef} rmRef={rmRef} buscar={buscarProduto}
                onSalvarParcial={() => submit("Referências salvas com sucesso.", { partial: true })} salvando={submitting} />
            )}
            {tab === "etapas" && (
              <EtapasTab etapas={etapas} setEt={setEt} addEtapa={addEtapa} rmEtapa={rmEtapa} tarefas={tarefas}
                onSalvarParcial={() => submit("Etapas salvas com sucesso.", { partial: true })} salvando={submitting} />
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
                        toast.success("Chamado excluído");
                        onDeleted?.();
                      } catch (e: any) { toast.error(e?.message || "Erro ao excluir chamado"); }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
                  >
                    <Trash2 className="w-4 h-4"/>Excluir chamado
                  </button>
                )}
              </div>
              {podeMonitorar && (
                <button
                  type="button"
                  onClick={handleOpenMonitorAsk}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 rounded-md hover:bg-emerald-100 cursor-pointer transition-colors"
                  title="Registrar resultado do monitoramento"
                >
                  <ClipboardCheck className="w-4 h-4 text-emerald-600"/>Resultado do monitoramento
                </button>
              )}
              <div className="flex items-center gap-2">
                {(onCancel || mode === "novo") && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onCancel) return onCancel();
                      if (!confirm("Cancelar a inclusão? Os dados preenchidos serão descartados.")) return;
                      setForm({
                        Chamado: "", Loja: "", Tipo: "", NF: "",
                        "Dt Emissão": "", CD: "", "Situação ": "",
                        "Dt Abertura": hojeISO(), "Dt Finalização": "", "Dt Pagamento": "",
                        "Status Chamado": "",
                        Motivo: "", Transportadora: "", Conferente: "",
                        _valor: "",
                      });
                      setRefs([]); setEtapas([]); setFeedback(null);
                      toast.info("Inclusão cancelada");
                    }}
                    className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                )}
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

      {manage && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) { setManage(null); loadListas(); } }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[98vw] h-[96vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
              <h3 className="font-semibold text-slate-800">
                {manage === "transp" && "Cadastro de Transportadoras"}
                {manage === "conf" && "Cadastro de Conferentes"}
                {manage === "motivo" && "Cadastro de Motivos"}
              </h3>
              <button onClick={() => { setManage(null); loadListas(); }} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5"/></button>
            </div>
            <div className="flex-1 overflow-auto">
              {manage === "transp" && (
                <CadastroSimples titulo="Transportadoras" listFn={listTransportadoras} upsertFn={upsertTransportadora} deleteFn={deleteTransportadora} />
              )}
              {manage === "conf" && (
                <CadastroSimples titulo="Conferentes" listFn={listConferentes} upsertFn={upsertConferente} deleteFn={deleteConferente}
                  extraFields={[{ key: "cd", label: "CD", type: "select", options: ["ES", "PB"] }]} />
              )}
              {manage === "motivo" && (
                <CadastroSimples titulo="Motivos" listFn={listMotivos} upsertFn={upsertMotivo} deleteFn={deleteMotivo} />
              )}
            </div>
          </div>
        </div>
      )}

      {lojaOpen && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setLojaOpen(false); }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[98vw] h-[96vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
              <h3 className="font-semibold text-slate-800">Cadastro de Lojas</h3>
              <button onClick={() => setLojaOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5"/></button>
            </div>
            <div className="flex-1 overflow-auto">
              <CadastroLojas buscaInicial={form.Loja || ""} />
            </div>
          </div>
        </div>
      )}


      {monitorAsk && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setMonitorAsk(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="px-6 py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3 text-emerald-600">
                <ClipboardCheck className="w-6 h-6"/>
              </div>
              <h3 className="text-lg font-bold text-slate-800">Resultado do Monitoramento</h3>
              <p className="text-xs text-slate-500 mt-1">A falta reportada neste chamado foi aprovada?</p>
              
              <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-slate-600 text-left space-y-1">
                <div><span className="font-semibold text-slate-700">Transportadora:</span> {form.Transportadora || "—"}</div>
                <div><span className="font-semibold text-slate-700">Conferente:</span> {form.Conferente || "—"}</div>
                <div><span className="font-semibold text-slate-700">Motivo:</span> {form.Motivo || "—"}</div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-3 border-t bg-slate-50">
              <button onClick={() => setMonitorAsk(false)} className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg">Cancelar</button>
              <button onClick={() => aplicarResultadoMonitoramento(false)} className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200/80 rounded-lg hover:bg-rose-100 transition-colors">Não (Recusar)</button>
              <button onClick={() => aplicarResultadoMonitoramento(true)} className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs">Sim (Aprovar)</button>
            </div>
          </div>
        </div>
      )}
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


function CadastroTab({ form, setField, statusPagamento, sla, transp, confs, motivos, precisaTranspConf, precisaMotivo, statusChamado, onManage, lojaInfo, onEditLoja }: any) {
  const ManageBtn = ({ onClick, title }: { onClick: () => void; title: string }) => (
    <button type="button" onClick={onClick} title={title}
      className="inline-flex items-center justify-center p-0.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded">
      <Pencil className="w-3 h-3"/>
    </button>
  );
  return (
    <div className="space-y-5">
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Identificação</h2>
        <div className="flex flex-wrap gap-3">
          <Field label="Chamado *" className="w-[110px]"><input type="number" value={form.Chamado} onChange={(e) => setField("Chamado", e.target.value.slice(0, 8))} className={inputCls} required /></Field>
          <Field label="Loja *" className="w-[90px]"><input type="number" value={form.Loja} onChange={(e) => setField("Loja", e.target.value.slice(0, 5))} className={inputCls} required /></Field>
          <Field label="Tipo *" className="w-[130px]"><select value={form.Tipo} onChange={(e) => setField("Tipo", e.target.value)} className={inputCls} required><option value="">— Selecionar —</option>{TIPO_OPCOES.map((o) => <option key={o}>{o}</option>)}</select></Field>
          <Field label="CD *" className="w-[80px]"><select value={form.CD} onChange={(e) => setField("CD", e.target.value)} className={inputCls} required><option value="">—</option>{CD_OPCOES.map((o) => <option key={o}>{o}</option>)}</select></Field>
          <Field label="NF" className="w-[130px]"><input type="number" value={form.NF} onChange={(e) => setField("NF", e.target.value.slice(0, 10))} className={inputCls} /></Field>
          <Field label="Data Emissão" className="w-[140px]"><input type="date" value={form["Dt Emissão"]} onChange={(e) => setField("Dt Emissão", e.target.value)} className={inputCls} /></Field>
          <Field label="Valor" className="w-[130px]"><input type="number" step="0.01" value={form._valor} onChange={(e) => setField("_valor", e.target.value.slice(0, 14))} className={inputCls} /></Field>
        </div>
      </section>
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Status e Datas</h2>
        <div className="flex flex-wrap gap-3">
          <Field label="Data Abertura *" className="w-[140px]"><input type="date" value={form["Dt Abertura"]} onChange={(e) => setField("Dt Abertura", e.target.value)} className={inputCls} required /></Field>
          <Field label="Data Finalização" className="w-[140px]"><input type="date" value={form["Dt Finalização"]} onChange={(e) => setField("Dt Finalização", e.target.value)} className={inputCls} /></Field>
          <Field label="Data Pagamento" className="w-[140px]"><input type="date" value={form["Dt Pagamento"]} onChange={(e) => setField("Dt Pagamento", e.target.value)} className={inputCls} /></Field>
          <Field label="Status Pagamento (auto)" className="w-[140px]"><input value={statusPagamento} readOnly className={inputCls + " bg-slate-50 text-slate-500"} /></Field>
          <Field label="Situação (tarefa atual) *" className="w-[240px]">
            <select value={form["Situação "]} onChange={(e) => setField("Situação ", e.target.value)} className={inputCls} required><option value="">— Selecionar —</option>{SITUACAO_OPCOES.map((o) => <option key={o}>{o}</option>)}</select>
          </Field>
          <Field label="Status Chamado *" className="w-[180px]">
            <select value={form["Status Chamado"]} onChange={(e) => setField("Status Chamado", e.target.value)} className={inputCls} required><option value="">— Selecionar —</option>{STATUS_CHAMADO_OPCOES.map((o) => <option key={o}>{o}</option>)}</select>
          </Field>
          <Field label="SLA (auto, dias úteis)" className="w-[150px]"><input value={sla || "—"} readOnly className={inputCls + " bg-slate-50 text-slate-500"} /></Field>
        </div>
      </section>
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
          <span>Responsáveis</span>
          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
            * Transportadora, Conferente e Motivo são obrigatórios para o resultado do monitoramento
          </span>
        </h2>
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              Transportadora {precisaTranspConf ? "*" : ""}
              <ManageBtn onClick={() => onManage("transp")} title="Cadastrar transportadoras" />
            </span>
            <Combobox value={form.Transportadora} onChange={(v) => setField("Transportadora", v)} options={transp} uppercase />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              Conferente {precisaTranspConf ? "*" : ""}
              <ManageBtn onClick={() => onManage("conf")} title="Cadastrar conferentes" />
            </span>
            <Combobox value={form.Conferente} onChange={(v) => setField("Conferente", v)} options={confs} uppercase />
          </div>
          <div className="flex flex-col gap-1 lg:col-span-2">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              Motivo {precisaMotivo ? "*" : ""}
              <ManageBtn onClick={() => onManage("motivo")} title="Cadastrar motivos" />
            </span>
            <Combobox value={form.Motivo} onChange={(v) => setField("Motivo", v)} options={motivos} />
          </div>
        </div>
      </section>
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
          Dados Bancários da Loja
          <span className="text-[10px] font-normal text-slate-400 normal-case">(somente leitura)</span>
          <button type="button" onClick={onEditLoja} title="Abrir cadastro de lojas para alterar"
            className="inline-flex items-center justify-center p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded">
            <Pencil className="w-3.5 h-3.5"/>
          </button>
        </h2>
        {!form.Loja ? (
          <div className="text-xs text-slate-400 border border-dashed border-slate-200 rounded-md p-3">Informe o número da loja para exibir os dados bancários.</div>
        ) : !lojaInfo ? (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3 flex items-center justify-between gap-2">
            <span>Loja <b>{form.Loja}</b> não cadastrada. Clique no lápis acima para cadastrar.</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {[
              ["Razão Social", lojaInfo.razao_social, "w-[260px]"],
              ["CNPJ", lojaInfo.cnpj, "w-[160px]"],
              ["Tipo", lojaInfo.tipo, "w-[110px]"],
              ["Banco", lojaInfo.banco, "w-[180px]"],
              ["Agência", lojaInfo.agencia || null, "w-[100px]"],
              ["Dígito Ag.", lojaInfo.agencia_dig || null, "w-[80px]"],
              ["Conta", lojaInfo.conta || null, "w-[130px]"],
              ["Dígito Cta.", lojaInfo.conta_dig || null, "w-[80px]"],
            ].map(([label, val, w]) => (
              <div key={label as string} className={w as string}>
                <div className="text-[10px] font-semibold text-slate-500 uppercase">{label}</div>
                <div className="mt-1 rounded-md bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 min-h-[34px]">{val || "—"}</div>
              </div>
            ))}
          </div>
        )}
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

function ReferenciasTab({ refs, setRef, addRef, rmRef, buscar, onSalvarParcial, salvando }: any) {
  const [editIdx, setEditIdx] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-slate-500">Adicione uma ou mais referências. Digite a referência e clique em buscar para auto-preencher descrição e fornecedor.</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={addRef} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md">
            <Plus className="w-3.5 h-3.5"/>Adicionar
          </button>
          <button type="button" onClick={onSalvarParcial} disabled={salvando} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md disabled:opacity-50">
            {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Save className="w-3.5 h-3.5"/>}Salvar referências
          </button>
        </div>
      </div>
      {refs.length === 0 && <div className="text-center py-8 text-slate-400 text-sm border border-dashed rounded-lg">Nenhuma referência ainda.</div>}
      <div className="space-y-2">
        {refs.map((r: Referencia, idx: number) => (
          <div key={idx} className="grid grid-cols-[minmax(140px,1.6fr)_minmax(80px,1fr)_minmax(160px,1.8fr)_minmax(110px,1.2fr)_70px_80px_auto] gap-2 items-end p-3 border border-slate-200 rounded-lg bg-slate-50/50">
            <Field label="Referência">
              <div className="flex gap-1">
                <input
                  value={r.referencia}
                  onChange={(e) => setRef(idx, { referencia: e.target.value })}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData("text").trim();
                    if (text) {
                      e.preventDefault();
                      setRef(idx, { referencia: text });
                      setTimeout(() => buscar(idx), 0);
                    }
                  }}
                  onBlur={() => { if ((r.referencia || "").trim() && !r.descricao) buscar(idx); }}
                  className={inputCls}
                />
                <button type="button" onClick={() => buscar(idx)} title="Buscar produto" className="px-2 border border-slate-300 rounded-md hover:bg-slate-100"><Search className="w-4 h-4 text-slate-600"/></button>
              </div>
            </Field>
            <Field label="Cor"><input value={r.cor} onChange={(e) => setRef(idx, { cor: e.target.value })} className={inputCls} /></Field>
            <Field label="Descrição"><input value={r.descricao} onChange={(e) => setRef(idx, { descricao: e.target.value })} className={inputCls} /></Field>
            <Field label="Fornecedor"><input value={r.fornecedor} onChange={(e) => setRef(idx, { fornecedor: e.target.value })} className={inputCls} /></Field>
            <Field label="Tam."><input value={r.tamanho} onChange={(e) => setRef(idx, { tamanho: e.target.value })} className={inputCls} /></Field>
            <Field label="Qtd"><input type="number" value={r.quantidade} onChange={(e) => setRef(idx, { quantidade: e.target.value })} className={inputCls} /></Field>
            <div className="flex items-center gap-1 pb-0.5">
              <button type="button" onClick={() => setEditIdx(idx)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-md" title="Editar"><Pencil className="w-4 h-4"/></button>
              <button type="button" onClick={() => rmRef(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-md" title="Remover"><Trash2 className="w-4 h-4"/></button>
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

function EtapasTab({ etapas, setEt, addEtapa, rmEtapa, tarefas, onSalvarParcial, salvando }: any) {
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const prevLenRef = useRef<number>(etapas.length);
  useEffect(() => {
    if (etapas.length > prevLenRef.current) {
      requestAnimationFrame(() => {
        const el = listRef.current?.lastElementChild as HTMLElement | undefined;
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        const firstInput = el?.querySelector("select, input") as HTMLElement | undefined;
        firstInput?.focus?.();
      });
    }
    prevLenRef.current = etapas.length;
  }, [etapas.length]);
  return (
    <div className="space-y-3 relative">
      <div className="flex justify-between items-center sticky top-0 z-20 bg-white/95 backdrop-blur py-2 -mx-1 px-1 border-b border-slate-100">
        <p className="text-xs text-slate-500">Etapas do fluxo. Data prevista e SLA são calculados automaticamente em dias úteis.</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={addEtapa} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md">
            <Plus className="w-3.5 h-3.5"/>Adicionar
          </button>
          <button type="button" onClick={onSalvarParcial} disabled={salvando} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md disabled:opacity-50">
            {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Save className="w-3.5 h-3.5"/>}Salvar etapas
          </button>
        </div>
      </div>
      {etapas.length === 0 && <div className="text-center py-8 text-slate-400 text-sm border border-dashed rounded-lg">Nenhuma etapa ainda.</div>}
      <div ref={listRef} className="space-y-2">
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
            <div key={idx} className="etapa-row grid grid-cols-[minmax(200px,2.4fr)_90px_130px_130px_130px_auto] gap-2 items-end p-3 border border-slate-200 rounded-lg">
              <Field label="Tarefa *">
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
              <Field label="SLA (dias)"><input type="number" min={0} value={e.dias_uteis_previsto ?? ""} onChange={(ev) => setEt(idx, { dias_uteis_previsto: ev.target.value === "" ? null : Number(ev.target.value) })} className={inputCls} /></Field>
              <Field label="Início"><input type="date" value={e.dt_inicio} onChange={(ev) => setEt(idx, { dt_inicio: ev.target.value })} className={inputCls} /></Field>
              <Field label="Previsto"><input value={fmtBR(dtPrev) || "—"} readOnly className={inputCls + " bg-slate-50 text-slate-500"} /></Field>
              <Field label="Finalizado"><input type="date" value={e.dt_fim} onChange={(ev) => setEt(idx, { dt_fim: ev.target.value })} className={inputCls} /></Field>
              <div className="flex items-center gap-1 pb-0.5">
                {sla && <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold whitespace-nowrap ${sla.cor}`}>{sla.texto}</span>}
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
