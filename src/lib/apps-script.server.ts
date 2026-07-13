// Sincronização automática com a planilha (Google Apps Script)
// Fire-and-forget: erros são logados mas não interrompem a operação principal.

const URL_ENV = () => process.env.APPS_SCRIPT_URL || "";

type SyncPayload = {
  action: "insert" | "update" | "delete";
  chamado?: any;
  ids?: string[]; // para delete
  referencias?: any[];
  etapas?: any[];
};

export async function syncToAppsScript(payload: SyncPayload) {
  const url = URL_ENV();
  if (!url) {
    console.warn("[apps-script] APPS_SCRIPT_URL não configurada — sync ignorado");
    return { ok: false, skipped: true };
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // Apps Script pode demorar; sem timeout customizado, fica no default do runtime
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`[apps-script] falha ${res.status}: ${text.slice(0, 300)}`);
      return { ok: false, status: res.status, body: text };
    }
    return { ok: true, body: text };
  } catch (e: any) {
    console.error("[apps-script] erro:", e?.message || e);
    return { ok: false, error: String(e?.message || e) };
  }
}

// Monta o objeto no formato "planilha" (mesmas chaves usadas no formulário)
export function buildChamadoRow(c: any, extra?: { sla?: string; statusPagamento?: string }) {
  return {
    Chamado: c.chamado ?? "",
    Loja: c.loja ?? "",
    Tipo: c.tipo ?? "",
    NF: c.nf ?? "",
    "Dt Emissão": c.dt_emissao ?? "",
    " Valor ": c.valor ?? "",
    CD: c.cd ?? "",
    "Situação ": c.situacao ?? "",
    "Dt Abertura": c.dt_abertura ?? "",
    "Dt Finalização": c.dt_finalizacao ?? "",
    "Dt Pagamento": c.dt_pagamento ?? "",
    "SLA por chamado (60dias)": extra?.sla ?? c.sla_status ?? "",
    "Status Pagamento": extra?.statusPagamento ?? c.status_pagamento ?? "",
    "Status Chamado": c.status_chamado ?? "",
    Motivo: c.motivo ?? "",
    Transportadora: c.transportadora ?? "",
    Conferente: c.conferente ?? "",
    Periodo: c.periodo ?? "",
  };
}
