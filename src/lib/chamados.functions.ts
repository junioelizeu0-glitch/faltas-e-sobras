import { createServerFn } from "@tanstack/react-start";

async function getSupabase() {
  const { getServerSupabase } = await import("@/integrations/supabase/server-client");
  return getServerSupabase();
}

// ===== Feriados / dias úteis =====
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
function parseISO(s?: string | null): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

// ===== Tipos =====
export type TarefaCatalogo = {
  id: string;
  nome: string;
  dias_uteis: number;
  aplica_faltas: boolean;
  aplica_sobras: boolean;
  ativo: boolean;
  ordem: number;
};

export type ReferenciaInput = {
  referencia?: string;
  cor?: string;
  tamanho?: string;
  fornecedor?: string;
  descricao?: string;
  quantidade?: number | string;
};

export type EtapaInput = {
  tarefa_id?: string | null;
  nome_tarefa: string;
  dias_uteis_previsto?: number | null;
  dt_inicio?: string | null;
  dt_fim?: string | null;
  ordem?: number;
};

// ===== Tarefas catálogo =====
export const listTarefas = createServerFn({ method: "GET" })
  .inputValidator((data: { tipo?: "FALTAS" | "SOBRAS" | "TODAS" } | undefined) => data ?? {})
  .handler(async ({ data }) => {
    const { requireUnlockedSession } = await import("@/lib/gate.server");
    await requireUnlockedSession();
    const supabase = await getSupabase();
    let q = supabase.from("tarefas_catalogo").select("*").eq("ativo", true).order("ordem", { ascending: true });
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const tipo = data?.tipo;
    const filtered = (rows ?? []).filter((r: any) => {
      if (!tipo || tipo === "TODAS") return true;
      if (tipo === "FALTAS") return r.aplica_faltas;
      if (tipo === "SOBRAS") return r.aplica_sobras;
      return true;
    });
    return filtered as TarefaCatalogo[];
  });

export const listAllTarefas = createServerFn({ method: "GET" }).handler(async () => {
  const { requireUnlockedSession } = await import("@/lib/gate.server");
  await requireUnlockedSession();
  const supabase = await getSupabase();
  const { data, error } = await supabase.from("tarefas_catalogo").select("*").order("ordem", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as TarefaCatalogo[];
});

export const upsertTarefa = createServerFn({ method: "POST" })
  .inputValidator((data: {
    id?: string;
    nome: string;
    dias_uteis: number;
    aplica_faltas: boolean;
    aplica_sobras: boolean;
    ativo?: boolean;
    ordem?: number;
  }) => data)
  .handler(async ({ data }) => {
    const { requireUnlockedSession } = await import("@/lib/gate.server");
    await requireUnlockedSession();
    const supabase = await getSupabase();
    const row = {
      nome: data.nome.trim(),
      dias_uteis: Number(data.dias_uteis) || 1,
      aplica_faltas: !!data.aplica_faltas,
      aplica_sobras: !!data.aplica_sobras,
      ativo: data.ativo !== false,
      ordem: Number(data.ordem) || 0,
    };
    if (data.id) {
      const { error } = await supabase.from("tarefas_catalogo").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: inserted, error } = await supabase.from("tarefas_catalogo").insert(row).select().single();
    if (error) throw new Error(error.message);
    return { ok: true, id: inserted.id };
  });

export const deleteTarefa = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { requireUnlockedSession } = await import("@/lib/gate.server");
    await requireUnlockedSession();
    const supabase = await getSupabase();
    const { error } = await supabase.from("tarefas_catalogo").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Chamado completo =====
export const createChamadoCompleto = createServerFn({ method: "POST" })
  .inputValidator((data: {
    chamado: any; // mesmo formato do createChamado atual (NovoChamadoPayload sem aba)
    referencias: ReferenciaInput[];
    etapas: EtapaInput[];
  }) => data)
  .handler(async ({ data }) => {
    const { requireUnlockedSession } = await import("@/lib/gate.server");
    await requireUnlockedSession();
    const supabase = await getSupabase();

    const c = data.chamado;
    const nullIfEmpty = (v: any) => {
      if (v === undefined || v === null) return null;
      const s = String(v).trim();
      return s === "" ? null : s;
    };
    const numOrNull = (v: any) => {
      const s = nullIfEmpty(v);
      if (!s) return null;
      const n = Number(String(s).replace(",", "."));
      return isNaN(n) ? null : n;
    };
    const dateOrNull = (v: any) => {
      const s = nullIfEmpty(v);
      if (!s) return null;
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
      if (m) return `${m[1]}-${m[2]}-${m[3]}`;
      const d = new Date(s);
      if (isNaN(d.getTime())) return null;
      return d.toISOString().slice(0, 10);
    };

    const chamadoRow = {
      chamado: nullIfEmpty(c.Chamado),
      loja: nullIfEmpty(c.Loja),
      tipo: nullIfEmpty(c.Tipo),
      nf: nullIfEmpty(c.NF),
      dt_emissao: dateOrNull(c["Dt Emissão"]),
      valor: numOrNull(c[" Valor "]),
      cd: nullIfEmpty(c.CD),
      situacao: nullIfEmpty(c["Situação "]),
      dt_abertura: dateOrNull(c["Dt Abertura"]),
      dt_finalizacao: dateOrNull(c["Dt Finalização"]),
      dt_pagamento: dateOrNull(c["Dt Pagamento"]),
      sla_status: nullIfEmpty(c["SLA por chamado (60dias)"]),
      status_pagamento: nullIfEmpty(c["Status Pagamento"]),
      status_chamado: nullIfEmpty(c["Status Chamado"]),
      motivo: nullIfEmpty(c.Motivo),
      transportadora: nullIfEmpty(c.Transportadora),
      conferente: nullIfEmpty(c.Conferente),
      periodo: dateOrNull(c.Periodo),
    };

    const { data: inserted, error: e1 } = await supabase
      .from("chamados_faltas")
      .insert(chamadoRow)
      .select()
      .single();
    if (e1) throw new Error(e1.message);
    const chamado_id = inserted.id;
    await upsertConferenteCD(supabase, chamadoRow.conferente, chamadoRow.cd);
    await upsertTransportadora(supabase, chamadoRow.transportadora);



    // Referências
    const refs = (data.referencias || [])
      .map((r: any) => ({
        chamado_id,
        referencia: nullIfEmpty(r.referencia),
        cor: nullIfEmpty(r.cor),
        tamanho: nullIfEmpty(r.tamanho),
        fornecedor: nullIfEmpty(r.fornecedor),
        descricao: nullIfEmpty(r.descricao),
        quantidade: numOrNull(r.quantidade),
      } as any))
      .filter((r: any) => r.referencia || r.cor || r.tamanho || r.fornecedor || r.descricao);
    if (refs.length > 0) {
      const { error: e2 } = await supabase.from("chamados_referencias").insert(refs);
      if (e2) throw new Error("Erro nas referências: " + e2.message);
    }

    // Etapas (calcula sla_status / dias_uteis_real quando dt_fim preenchida)
    const etapas = (data.etapas || []).map((et, idx) => {
      const inicio = parseISO(et.dt_inicio ?? null);
      const fim = parseISO(et.dt_fim ?? null);
      let dias_real: number | null = null;
      let sla: string | null = null;
      if (inicio && fim) {
        dias_real = diasUteisEntre(inicio, fim);
        if (et.dias_uteis_previsto != null) {
          sla = dias_real <= et.dias_uteis_previsto ? "Dentro do SLA" : "Fora do SLA";
        }
      } else if (inicio && !fim) {
        sla = "Em Aberto";
      }
      return {
        chamado_id,
        tarefa_id: et.tarefa_id || null,
        nome_tarefa: et.nome_tarefa,
        dias_uteis_previsto: et.dias_uteis_previsto ?? null,
        dt_inicio: dateOrNull(et.dt_inicio),
        dt_fim: dateOrNull(et.dt_fim),
        dias_uteis_real: dias_real,
        sla_status: sla,
        ordem: et.ordem ?? idx + 1,
      };
    });

    // Se não veio nenhuma etapa, cria "Aguardando Monitoramento" default
    if (etapas.length === 0) {
      const { data: t } = await supabase
        .from("tarefas_catalogo")
        .select("*")
        .ilike("nome", "%aguardando monitoramento%")
        .limit(1)
        .maybeSingle();
      const hoje = new Date().toISOString().slice(0, 10);
      etapas.push({
        chamado_id,
        tarefa_id: t?.id ?? null,
        nome_tarefa: t?.nome ?? "Aguardando Monitoramento",
        dias_uteis_previsto: t?.dias_uteis ?? 2,
        dt_inicio: hoje,
        dt_fim: null,
        dias_uteis_real: null,
        sla_status: "Em Aberto",
        ordem: 1,
      });
    }

    if (etapas.length > 0) {
      const { error: e3 } = await supabase.from("chamados_etapas").insert(etapas);
      if (e3) throw new Error("Erro nas etapas: " + e3.message);
    }

    return { ok: true, id: chamado_id };
  });



// ===== Ler chamado completo =====
export const getChamadoCompleto = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { requireUnlockedSession } = await import("@/lib/gate.server");
    await requireUnlockedSession();
    const supabase = await getSupabase();
    const { data: chamado, error: e1 } = await supabase
      .from("chamados_faltas").select("*").eq("id", data.id).maybeSingle();
    if (e1) throw new Error(e1.message);
    const { data: refs, error: e2 } = await supabase
      .from("chamados_referencias").select("*").eq("chamado_id", data.id);
    if (e2) throw new Error(e2.message);
    const { data: etapas, error: e3 } = await supabase
      .from("chamados_etapas").select("*").eq("chamado_id", data.id).order("ordem");
    if (e3) throw new Error(e3.message);
    return { chamado, referencias: refs || [], etapas: etapas || [] };
  });

// ===== Atualizar chamado completo (substitui refs e etapas) =====
export const updateChamadoCompleto = createServerFn({ method: "POST" })
  .inputValidator((data: {
    id: string;
    chamado: any;
    referencias: any[];
    etapas: EtapaInput[];
  }) => data)
  .handler(async ({ data }) => {
    const { requireUnlockedSession } = await import("@/lib/gate.server");
    await requireUnlockedSession();
    const supabase = await getSupabase();

    const c = data.chamado;
    const nullIfEmpty = (v: any) => {
      if (v === undefined || v === null) return null;
      const s = String(v).trim();
      return s === "" ? null : s;
    };
    const numOrNull = (v: any) => {
      const s = nullIfEmpty(v);
      if (!s) return null;
      const n = Number(String(s).replace(",", "."));
      return isNaN(n) ? null : n;
    };
    const dateOrNull = (v: any) => {
      const s = nullIfEmpty(v);
      if (!s) return null;
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
      if (m) return `${m[1]}-${m[2]}-${m[3]}`;
      const d = new Date(s);
      if (isNaN(d.getTime())) return null;
      return d.toISOString().slice(0, 10);
    };

    const row = {
      chamado: nullIfEmpty(c.Chamado),
      loja: nullIfEmpty(c.Loja),
      tipo: nullIfEmpty(c.Tipo),
      nf: nullIfEmpty(c.NF),
      dt_emissao: dateOrNull(c["Dt Emissão"]),
      valor: numOrNull(c[" Valor "]),
      cd: nullIfEmpty(c.CD),
      situacao: nullIfEmpty(c["Situação "]),
      dt_abertura: dateOrNull(c["Dt Abertura"]),
      dt_finalizacao: dateOrNull(c["Dt Finalização"]),
      dt_pagamento: dateOrNull(c["Dt Pagamento"]),
      sla_status: nullIfEmpty(c["SLA por chamado (60dias)"]),
      status_pagamento: nullIfEmpty(c["Status Pagamento"]),
      status_chamado: nullIfEmpty(c["Status Chamado"]),
      motivo: nullIfEmpty(c.Motivo),
      transportadora: nullIfEmpty(c.Transportadora),
      conferente: nullIfEmpty(c.Conferente),
      periodo: dateOrNull(c.Periodo),
    };
    const { error: eu } = await supabase.from("chamados_faltas").update(row).eq("id", data.id);
    if (eu) throw new Error(eu.message);

    // refs: delete + reinsert
    await supabase.from("chamados_referencias").delete().eq("chamado_id", data.id);
    const refs = (data.referencias || [])
      .map((r: any) => ({
        chamado_id: data.id,
        referencia: nullIfEmpty(r.referencia),
        cor: nullIfEmpty(r.cor),
        tamanho: nullIfEmpty(r.tamanho),
        fornecedor: nullIfEmpty(r.fornecedor),
        descricao: nullIfEmpty(r.descricao),
        quantidade: numOrNull(r.quantidade),
      } as any))
      .filter((r: any) => r.referencia || r.cor || r.tamanho || r.fornecedor || r.descricao);
    if (refs.length > 0) {
      const { error } = await (supabase.from("chamados_referencias") as any).insert(refs);
      if (error) throw new Error("Erro nas referências: " + error.message);
    }

    // etapas: delete + reinsert
    await supabase.from("chamados_etapas").delete().eq("chamado_id", data.id);
    const etapas = (data.etapas || []).map((et, idx) => {
      const inicio = parseISO(et.dt_inicio ?? null);
      const fim = parseISO(et.dt_fim ?? null);
      let dias_real: number | null = null;
      let sla: string | null = null;
      if (inicio && fim) {
        dias_real = diasUteisEntre(inicio, fim);
        if (et.dias_uteis_previsto != null) {
          sla = dias_real <= et.dias_uteis_previsto ? "Dentro do SLA" : "Fora do SLA";
        }
      } else if (inicio && !fim) {
        sla = "Em Aberto";
      }
      return {
        chamado_id: data.id,
        tarefa_id: et.tarefa_id || null,
        nome_tarefa: et.nome_tarefa,
        dias_uteis_previsto: et.dias_uteis_previsto ?? null,
        dt_inicio: et.dt_inicio || null,
        dt_fim: et.dt_fim || null,
        dias_uteis_real: dias_real,
        sla_status: sla,
        ordem: et.ordem ?? idx + 1,
      };
    }).filter((e) => e.nome_tarefa);
    if (etapas.length > 0) {
      const { error } = await supabase.from("chamados_etapas").insert(etapas);
      if (error) throw new Error("Erro nas etapas: " + error.message);
    }

    return { ok: true, id: data.id };
  });

