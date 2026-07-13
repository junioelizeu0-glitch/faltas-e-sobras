import { createServerFn } from "@tanstack/react-start";

async function getSupabase() {
  const { getServerSupabase } = await import("@/integrations/supabase/server-client");
  return getServerSupabase();
}

const nullIfEmpty = (v: any) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};
const numOrNull = (v: any) => {
  const s = nullIfEmpty(v);
  if (!s) return null;
  const n = Number(String(s).replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? null : n;
};
const dateOrNull = (v: any) => {
  const s = nullIfEmpty(v);
  if (!s) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

function apiRowToDb(r: any) {
  return {
    chamado: nullIfEmpty(r.Chamado ?? r.chamado),
    loja: nullIfEmpty(r.Loja ?? r.loja),
    tipo: nullIfEmpty(r.Tipo ?? r.tipo),
    nf: nullIfEmpty(r.NF ?? r.nf),
    dt_emissao: dateOrNull(r["Dt Emissão"] ?? r.dt_emissao),
    valor: numOrNull(r[" Valor "] ?? r.Valor ?? r.valor),
    cd: nullIfEmpty(r.CD ?? r.cd),
    situacao: nullIfEmpty(r["Situação "] ?? r["Situação"] ?? r.situacao),
    dt_abertura: dateOrNull(r["Dt Abertura"] ?? r.dt_abertura),
    dt_finalizacao: dateOrNull(r["Dt Finalização"] ?? r.dt_finalizacao),
    dt_pagamento: dateOrNull(r["Dt Pagamento"] ?? r.dt_pagamento),
    sla_status: nullIfEmpty(r["SLA por chamado (60dias)"] ?? r.sla_status),
    status_pagamento: nullIfEmpty(r["Status Pagamento"] ?? r.status_pagamento),
    status_chamado: nullIfEmpty(r["Status Chamado"] ?? r.status_chamado),
    motivo: nullIfEmpty(r.Motivo ?? r.motivo),
    transportadora: nullIfEmpty(r.Transportadora ?? r.transportadora),
    conferente: nullIfEmpty(r.Conferente ?? r.conferente),
    periodo: dateOrNull(r.Periodo ?? r.periodo),
  };
}

// ============ PULL: planilha -> banco ============
export const pullFromAppsScript = createServerFn({ method: "POST" }).handler(async () => {
  const { requireUnlockedSession } = await import("@/lib/gate.server");
  await requireUnlockedSession();
  const url = process.env.APPS_SCRIPT_URL;
  if (!url) throw new Error("APPS_SCRIPT_URL não configurada");

  const res = await fetch(url, { method: "GET", redirect: "follow" });
  const text = await res.text();
  if (!res.ok) throw new Error(`Apps Script GET ${res.status}: ${text.slice(0, 200)}`);
  let json: any;
  try { json = JSON.parse(text); } catch { throw new Error("Resposta da API não é JSON válido"); }

  // O doGet do Apps Script pode devolver { faltas: [...] } ou array direto.
  const rows: any[] = Array.isArray(json)
    ? json
    : json.faltas ?? json.FALTAS ?? json.data ?? json.rows ?? [];

  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: true, inseridos: 0, atualizados: 0, total: 0, message: "Nenhum registro retornado pela API." };
  }

  const supabase = await getSupabase();
  // Busca chamados existentes por número para decidir insert vs update
  const { data: existentes } = await supabase.from("chamados_faltas").select("id, chamado");
  const mapa = new Map<string, string>();
  (existentes || []).forEach((r: any) => { if (r.chamado) mapa.set(String(r.chamado), r.id); });

  let inseridos = 0, atualizados = 0, ignorados = 0;
  const paraInserir: any[] = [];

  for (const r of rows) {
    const db = apiRowToDb(r);
    if (!db.chamado) { ignorados++; continue; }
    const existingId = mapa.get(String(db.chamado));
    if (existingId) {
      const { error } = await supabase.from("chamados_faltas").update(db).eq("id", existingId);
      if (!error) atualizados++;
    } else {
      paraInserir.push(db);
    }
  }

  if (paraInserir.length > 0) {
    // Insere em lotes de 500 para evitar payload gigante
    for (let i = 0; i < paraInserir.length; i += 500) {
      const chunk = paraInserir.slice(i, i + 500);
      const { error } = await supabase.from("chamados_faltas").insert(chunk);
      if (!error) inseridos += chunk.length;
    }
  }

  return { ok: true, inseridos, atualizados, ignorados, total: rows.length };
});

// ============ PUSH: banco -> planilha ============
export const pushToAppsScript = createServerFn({ method: "POST" }).handler(async () => {
  const { requireUnlockedSession } = await import("@/lib/gate.server");
  await requireUnlockedSession();
  const url = process.env.APPS_SCRIPT_URL;
  if (!url) throw new Error("APPS_SCRIPT_URL não configurada");

  const supabase = await getSupabase();
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

  const { buildChamadoRow } = await import("@/lib/apps-script.server");
  const rows = all.map((c) => buildChamadoRow(c));

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "bulk_replace", sheet: "CONTROLE CHAMADOS (FALTAS)", rows }),
    redirect: "follow",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Apps Script POST ${res.status}: ${text.slice(0, 200)}`);
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  if (json && json.success === false) throw new Error(json.error || "Apps Script retornou success=false");

  return { ok: true, enviados: rows.length, response: json ?? text.slice(0, 200) };
});
