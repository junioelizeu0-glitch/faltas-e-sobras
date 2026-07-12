import { createServerFn } from "@tanstack/react-start";
import { requireUnlockedSession } from "@/lib/gate.functions";

async function getSupabase() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function toApiShape(row: any) {
  return {
    Chamado: row.chamado ?? "",
    Loja: row.loja ?? "",
    Tipo: row.tipo ?? "",
    NF: row.nf ?? "",
    "Dt Emissão": row.dt_emissao ?? "",
    " Valor ": row.valor ?? "",
    CD: row.cd ?? "",
    "Situação ": row.situacao ?? "",
    "Dt Abertura": row.dt_abertura ?? "",
    "Dt Finalização": row.dt_finalizacao ?? "",
    "Dt Pagamento": row.dt_pagamento ?? "",
    "SLA por chamado (60dias)": row.sla_status ?? "",
    "Status Pagamento": row.status_pagamento ?? "",
    "Status Chamado": row.status_chamado ?? "",
    Motivo: row.motivo ?? "",
    Transportadora: row.transportadora ?? "",
    Conferente: row.conferente ?? "",
    Periodo: row.periodo ?? "",
  };
}

export const fetchDashboardData = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = getSupabase();
    const all: any[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("chamados_faltas")
        .select("*")
        .order("dt_abertura", { ascending: false })
        .range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    return all.map(toApiShape);
  },
);

export type NovoChamadoPayload = {
  aba: "FALTAS" | "SOBRA" | "RECALL" | "GATO";
  Chamado: number | string;
  Loja: number | string;
  Tipo: string;
  NF: number | string;
  "Dt Emissão": string;
  " Valor ": number | string;
  CD: string;
  "Situação ": string;
  "Dt Abertura": string;
  "Dt Finalização": string;
  "Dt Pagamento": string;
  "SLA por chamado (60dias)": string;
  "Status Pagamento": string;
  "Status Chamado": string;
  Motivo: string;
  Transportadora: string;
  Conferente: string;
  Periodo: string;
};

const nullIfEmpty = (v: any) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
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
const numOrNull = (v: any) => {
  const s = nullIfEmpty(v);
  if (!s) return null;
  const n = Number(String(s).replace(",", "."));
  return isNaN(n) ? null : n;
};

const SHEET_NAMES: Record<NovoChamadoPayload["aba"], string> = {
  FALTAS: "CONTROLE CHAMADOS (FALTAS)",
  SOBRA: "CONTROLE CHAMADOS (SOBRAS)",
  RECALL: "CONTROLE CHAMADOS (RECALL)",
  GATO: "CONTROLE CHAMADOS (GATO)",
};

async function mirrorToAppsScript(
  aba: NovoChamadoPayload["aba"],
  payload: NovoChamadoPayload,
): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.APPS_SCRIPT_URL;
  if (!url) return { ok: false, error: "APPS_SCRIPT_URL não configurada" };
  try {
    const { aba: _drop, ...fields } = payload;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "insert",
        sheet: SHEET_NAMES[aba],
        data: fields,
      }),
      redirect: "follow",
    });
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch {}
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    if (json && json.success === false) return { ok: false, error: json.error || "Resposta success=false" };
    if (!json) return { ok: false, error: "Resposta não-JSON do Apps Script (verifique deploy)" };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

export const createChamado = createServerFn({ method: "POST" })
  .inputValidator((data: NovoChamadoPayload) => data)
  .handler(async ({ data }) => {
    if (data.aba !== "FALTAS") {
      throw new Error(
        "Inclusão por esta aba ainda não está habilitada. Somente FALTAS está migrado.",
      );
    }
    const supabase = getSupabase();
    const row = {
      chamado: nullIfEmpty(data.Chamado),
      loja: nullIfEmpty(data.Loja),
      tipo: nullIfEmpty(data.Tipo),
      nf: nullIfEmpty(data.NF),
      dt_emissao: dateOrNull(data["Dt Emissão"]),
      valor: numOrNull(data[" Valor "]),
      cd: nullIfEmpty(data.CD),
      situacao: nullIfEmpty(data["Situação "]),
      dt_abertura: dateOrNull(data["Dt Abertura"]),
      dt_finalizacao: dateOrNull(data["Dt Finalização"]),
      dt_pagamento: dateOrNull(data["Dt Pagamento"]),
      sla_status: nullIfEmpty(data["SLA por chamado (60dias)"]),
      status_pagamento: nullIfEmpty(data["Status Pagamento"]),
      status_chamado: nullIfEmpty(data["Status Chamado"]),
      motivo: nullIfEmpty(data.Motivo),
      transportadora: nullIfEmpty(data.Transportadora),
      conferente: nullIfEmpty(data.Conferente),
      periodo: dateOrNull(data.Periodo),
    };
    const { data: inserted, error } = await supabase
      .from("chamados_faltas")
      .insert(row)
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Réplica na planilha (Apps Script). Não falha o fluxo se der erro.
    const mirror = await mirrorToAppsScript(data.aba, data);

    return {
      success: true,
      id: inserted?.id,
      mirrored: mirror.ok,
      mirrorError: mirror.ok ? undefined : mirror.error,
    };
  });

