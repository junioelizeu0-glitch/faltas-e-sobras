import { createServerFn } from "@tanstack/react-start";

async function getSupabase() {
  const { getServerSupabase } = await import("@/integrations/supabase/server-client");
  return getServerSupabase();
}

// Cria/atualiza o conferente com o CD do chamado (silencioso em caso de erro).
async function upsertConferenteCD(supabase: any, nome: string | null, cd: string | null) {
  const n = (nome || "").trim();
  if (!n) return;
  try {
    const { data: existing } = await supabase.from("conferentes").select("id, cd").ilike("nome", n).maybeSingle();
    if (existing) {
      if (cd && existing.cd !== cd) {
        await supabase.from("conferentes").update({ cd }).eq("id", existing.id);
      }
    } else {
      await supabase.from("conferentes").insert({ nome: n, cd: cd || null });
    }
  } catch { /* silencioso */ }
}
async function upsertTransportadora(supabase: any, nome: string | null) {
  const n = (nome || "").trim();
  if (!n) return;
  try {
    const { data: existing } = await supabase.from("transportadoras").select("id").ilike("nome", n).maybeSingle();
    if (!existing) await supabase.from("transportadoras").insert({ nome: n });
  } catch { /* silencioso */ }
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
  aplica_recall?: boolean;
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

function normalizeTarefaRow(r: any): TarefaCatalogo {
  const rawNome = String(r.nome || "").trim();
  const hasRecallTag = /\[recall\]/i.test(rawNome);
  const cleanNome = rawNome.replace(/\s*\[recall\]/i, "").trim();

  let recallVal = r.aplica_recall;
  if (recallVal === undefined || recallVal === null) {
    recallVal = hasRecallTag ? true : false;
  } else {
    recallVal = !!recallVal;
  }

  return {
    id: r.id,
    nome: cleanNome,
    dias_uteis: Number(r.dias_uteis) || 1,
    aplica_faltas: r.aplica_faltas !== false,
    aplica_sobras: !!r.aplica_sobras,
    aplica_recall: recallVal,
    ativo: r.ativo !== false,
    ordem: Number(r.ordem) || 0,
  };
}

// ===== Tarefas catálogo =====
export const listTarefas = createServerFn({ method: "GET" })
  .validator((data: { tipo?: "FALTAS" | "SOBRAS" | "RECALL" | "TODAS" } | undefined) => data ?? {})
  .handler(async ({ data }) => {
    const { requireUnlockedSession } = await import("@/lib/gate.server");
    await requireUnlockedSession();
    const supabase = await getSupabase();
    let q = supabase.from("tarefas_catalogo").select("*").eq("ativo", true).order("ordem", { ascending: true });
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const normalized = (rows ?? []).map(normalizeTarefaRow);
    const tipo = data?.tipo;
    const filtered = normalized.filter((r) => {
      if (!tipo || tipo === "TODAS") return true;
      if (tipo === "FALTAS") return r.aplica_faltas;
      if (tipo === "SOBRAS") return r.aplica_sobras;
      if (tipo === "RECALL") return r.aplica_recall;
      return true;
    });
    return filtered;
  });

export const listAllTarefas = createServerFn({ method: "GET" }).handler(async () => {
  const { requireUnlockedSession } = await import("@/lib/gate.server");
  await requireUnlockedSession();
  const supabase = await getSupabase();
  const { data, error } = await supabase.from("tarefas_catalogo").select("*").order("ordem", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(normalizeTarefaRow);
});

export const upsertTarefa = createServerFn({ method: "POST" })
  .validator((data: {
    id?: string;
    nome: string;
    dias_uteis: number;
    aplica_faltas: boolean;
    aplica_sobras: boolean;
    aplica_recall?: boolean;
    ativo?: boolean;
    ordem?: number;
  }) => data)
  .handler(async ({ data }) => {
    const { requireUnlockedSession } = await import("@/lib/gate.server");
    await requireUnlockedSession();
    const supabase = await getSupabase();
    const baseNome = data.nome.replace(/\s*\[recall\]/i, "").trim();
    const isRecall = !!data.aplica_recall;

    const rowFull: any = {
      nome: baseNome,
      dias_uteis: Number(data.dias_uteis) || 1,
      aplica_faltas: !!data.aplica_faltas,
      aplica_sobras: !!data.aplica_sobras,
      aplica_recall: isRecall,
      ativo: data.ativo !== false,
      ordem: Number(data.ordem) || 0,
    };

    if (data.id) {
      let { error } = await supabase.from("tarefas_catalogo").update(rowFull).eq("id", data.id);
      if (error && (error.message?.includes("aplica_recall") || error.code === "PGRST204")) {
        const { aplica_recall, ...rowWithoutRecall } = rowFull;
        rowWithoutRecall.nome = isRecall ? `${baseNome} [recall]` : baseNome;
        const res = await supabase.from("tarefas_catalogo").update(rowWithoutRecall).eq("id", data.id);
        error = res.error;
      }
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }

    let { data: inserted, error } = await supabase.from("tarefas_catalogo").insert(rowFull).select().single();
    if (error && (error.message?.includes("aplica_recall") || error.code === "PGRST204")) {
      const { aplica_recall, ...rowWithoutRecall } = rowFull;
      rowWithoutRecall.nome = isRecall ? `${baseNome} [recall]` : baseNome;
      const res = await supabase.from("tarefas_catalogo").insert(rowWithoutRecall).select().single();
      inserted = res.data;
      error = res.error;
    }
    if (error) throw new Error(error.message);
    return { ok: true, id: inserted?.id };
  });

export const deleteTarefa = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
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
  .validator((data: {
    chamado: any; // mesmo formato do createChamado atual (NovoChamadoPayload sem aba)
    referencias: ReferenciaInput[];
    etapas: EtapaInput[];
    tabela?: "faltas" | "recall";
  }) => data)
  .handler(async ({ data }) => {
    const { requireUnlockedSession } = await import("@/lib/gate.server");
    await requireUnlockedSession();
    const supabase = await getSupabase();

    const tblMain = data.tabela === "recall" ? "chamados_recall" : "chamados_faltas";
    const tblRefs = data.tabela === "recall" ? "chamados_recall_referencias" : "chamados_referencias";
    const tblEtapas = data.tabela === "recall" ? "chamados_recall_etapas" : "chamados_etapas";

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

    // Regra: número do chamado não pode duplicar
    if (chamadoRow.chamado) {
      const { data: dup } = await supabase
        .from(tblMain).select("id").eq("chamado", chamadoRow.chamado).limit(1).maybeSingle();
      if (dup) throw new Error(`Já existe um chamado com o número ${chamadoRow.chamado}.`);
    }

    const { data: inserted, error: e1 } = await supabase
      .from(tblMain)
      .insert(chamadoRow)
      .select()
      .single();
    if (e1) {
      const msg = e1.message.includes("does not exist")
        ? `A tabela '${tblMain}' não existe no Supabase. Por favor, rode o script SQL '20260825133500_create_chamados_recall.sql' no Supabase.`
        : e1.message;
      throw new Error(msg);
    }
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
      const { error: e2 } = await supabase.from(tblRefs).insert(refs);
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
      const { error: e3 } = await supabase.from(tblEtapas).insert(etapas);
      if (e3) throw new Error("Erro nas etapas: " + e3.message);
    }

    // Sync com planilha (fire-and-forget, apenas faltas por enquanto)
    if (data.tabela !== "recall") {
      try {
        const { syncToAppsScript, buildChamadoRow } = await import("@/lib/apps-script.server");
        await syncToAppsScript({
          action: "insert",
          chamado: buildChamadoRow(chamadoRow),
          referencias: refs,
          etapas,
        });
      } catch (e) { console.error("[sync] insert:", e); }
    }

    return { ok: true, id: chamado_id };
  });

// ===== Ler chamado completo =====
export const getChamadoCompleto = createServerFn({ method: "GET" })
  .validator((data: { id: string; tabela?: "faltas" | "recall" }) => data)
  .handler(async ({ data }) => {
    if (!data?.id) return { chamado: null, referencias: [], etapas: [] };
    const { requireUnlockedSession } = await import("@/lib/gate.server");
    await requireUnlockedSession();
    const supabase = await getSupabase();

    const tblMain = data.tabela === "recall" ? "chamados_recall" : "chamados_faltas";
    const tblRefs = data.tabela === "recall" ? "chamados_recall_referencias" : "chamados_referencias";
    const tblEtapas = data.tabela === "recall" ? "chamados_recall_etapas" : "chamados_etapas";

    let chamado: any = null;
    let refs: any[] = [];
    let etapas: any[] = [];

    // 1. Chamado principal
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id);
      let query = supabase.from(tblMain).select("*");
      if (isUuid) {
        query = query.eq("id", data.id);
      } else {
        query = query.eq("chamado", data.id);
      }
      const { data: res, error: e1 } = await query.limit(1).maybeSingle();
      if (e1) throw new Error(e1.message);
      chamado = res;
    } catch {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id);
      const whereClause = isUuid ? `id = '${data.id}'` : `chamado = '${data.id}'`;
      const { data: rpcRes } = await supabase.rpc("aiiliana_run_sql", {
        sql: `SELECT * FROM ${tblMain} WHERE ${whereClause} LIMIT 1`
      });
      if (Array.isArray(rpcRes) && rpcRes.length > 0) chamado = rpcRes[0];
    }

    if (!chamado) return { chamado: null, referencias: [], etapas: [] };

    const cId = chamado.id;

    // 2. Referencias
    try {
      const { data: res, error: e2 } = await supabase.from(tblRefs).select("*").eq("chamado_id", cId);
      if (e2) throw new Error(e2.message);
      refs = res || [];
    } catch {
      const { data: rpcRes } = await supabase.rpc("aiiliana_run_sql", {
        sql: `SELECT * FROM ${tblRefs} WHERE chamado_id = '${cId}'`
      });
      if (Array.isArray(rpcRes)) refs = rpcRes;
    }

    // 3. Etapas
    try {
      const { data: res, error: e3 } = await supabase.from(tblEtapas).select("*").eq("chamado_id", cId).order("ordem");
      if (e3) throw new Error(e3.message);
      etapas = res || [];
    } catch {
      const { data: rpcRes } = await supabase.rpc("aiiliana_run_sql", {
        sql: `SELECT * FROM ${tblEtapas} WHERE chamado_id = '${cId}' ORDER BY ordem ASC`
      });
      if (Array.isArray(rpcRes)) etapas = rpcRes;
    }

    return { chamado, referencias: refs, etapas };
  });

// ===== Atualizar chamado completo (substitui refs e etapas) =====
export const updateChamadoCompleto = createServerFn({ method: "POST" })
  .validator((data: {
    id: string;
    chamado: any;
    referencias: any[];
    etapas: EtapaInput[];
    tabela?: "faltas" | "recall";
  }) => data)
  .handler(async ({ data }) => {
    const { requireUnlockedSession } = await import("@/lib/gate.server");
    await requireUnlockedSession();
    const supabase = await getSupabase();

    const tblMain = data.tabela === "recall" ? "chamados_recall" : "chamados_faltas";
    const tblRefs = data.tabela === "recall" ? "chamados_recall_referencias" : "chamados_referencias";
    const tblEtapas = data.tabela === "recall" ? "chamados_recall_etapas" : "chamados_etapas";

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
    // Regra: número do chamado não pode duplicar (exceto o próprio)
    if (row.chamado) {
      const { data: dup } = await supabase
        .from(tblMain).select("id").eq("chamado", row.chamado).neq("id", data.id).limit(1).maybeSingle();
      if (dup) throw new Error(`Já existe outro chamado com o número ${row.chamado}.`);
    }
    const { error: eu } = await supabase.from(tblMain).update(row).eq("id", data.id);
    if (eu) throw new Error(eu.message);
    await upsertConferenteCD(supabase, row.conferente, row.cd);
    await upsertTransportadora(supabase, row.transportadora);

    // refs: delete + reinsert
    await supabase.from(tblRefs).delete().eq("chamado_id", data.id);
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
      const { error } = await (supabase.from(tblRefs) as any).insert(refs);
      if (error) throw new Error("Erro nas referências: " + error.message);
    }

    // etapas: delete + reinsert
    await supabase.from(tblEtapas).delete().eq("chamado_id", data.id);
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
      const { error } = await supabase.from(tblEtapas).insert(etapas);
      if (error) throw new Error("Erro nas etapas: " + error.message);
    }
    // Sync com planilha (fire-and-forget, apenas faltas por enquanto)
    if (data.tabela !== "recall") {
      try {
        const { syncToAppsScript, buildChamadoRow } = await import("@/lib/apps-script.server");
        await syncToAppsScript({
          action: "update",
          chamado: buildChamadoRow(row),
          referencias: refs,
          etapas,
        });
      } catch (e) { console.error("[sync] update:", e); }
    }

    return { ok: true, id: data.id };
  });

// ===== Excluir chamado(s) =====
export const deleteChamado = createServerFn({ method: "POST" })
  .validator((data: { ids: string[]; tabela?: "faltas" | "recall" }) => data)
  .handler(async ({ data }) => {
    const { requireUnlockedSession } = await import("@/lib/gate.server");
    await requireUnlockedSession();
    const supabase = await getSupabase();

    const tblMain = data.tabela === "recall" ? "chamados_recall" : "chamados_faltas";
    const tblRefs = data.tabela === "recall" ? "chamados_recall_referencias" : "chamados_referencias";
    const tblEtapas = data.tabela === "recall" ? "chamados_recall_etapas" : "chamados_etapas";

    const ids = (data.ids || []).filter(Boolean);
    if (!ids.length) return { ok: true, count: 0 };

    // Pega os números dos chamados antes de deletar (para sincronizar com a planilha)
    const { data: chamadosRows } = await supabase
      .from(tblMain).select("chamado").in("id", ids);
    const chamadoNums = (chamadosRows || []).map((r: any) => String(r.chamado)).filter(Boolean);

    await supabase.from(tblEtapas).delete().in("chamado_id", ids);
    await supabase.from(tblRefs).delete().in("chamado_id", ids);
    const { error } = await supabase.from(tblMain).delete().in("id", ids);
    if (error) throw new Error(error.message);

    // Sync com planilha (apenas se for faltas)
    if (data.tabela !== "recall") {
      try {
        const { syncToAppsScript } = await import("@/lib/apps-script.server");
        await syncToAppsScript({ action: "delete", ids: chamadoNums });
      } catch (e) { console.error("[sync] delete:", e); }
    }

    return { ok: true, count: ids.length };
  });


