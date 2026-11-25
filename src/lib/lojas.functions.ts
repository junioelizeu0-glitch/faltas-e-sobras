import { createServerFn } from "@tanstack/react-start";
import { getParceiroByLoja, TABELA_PARCEIROS_LOJAS } from "./lojas-parceiros.data";

export { getParceiroByLoja, TABELA_PARCEIROS_LOJAS };

export type Loja = {
  id: string;
  numero: string;
  parceiro: string | null;
  cnpj: string | null;
  razao_social: string | null;
  tipo: string | null;
  banco: string | null;
  agencia: string | null;
  agencia_dig: string | null;
  conta: string | null;
  conta_dig: string | null;
  observacao: string | null;
};

export const listLojas = createServerFn({ method: "GET" }).handler(async () => {
  const { requireUnlockedSession: _r } = await import("@/lib/gate.server"); await _r();
  const supabase = (await import("@/integrations/supabase/server-client")).getServerSupabase();
  const { data, error } = await supabase.from("lojas").select("*").order("numero", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => ({
    ...r,
    parceiro: r.parceiro || getParceiroByLoja(r.numero) || null,
  })) as Loja[];
});

export const getLojaByNumero = createServerFn({ method: "GET" })
  .validator((d: { numero: string }) => d)
  .handler(async ({ data }) => {
    const { requireUnlockedSession: _r } = await import("@/lib/gate.server"); await _r();
    const supabase = (await import("@/integrations/supabase/server-client")).getServerSupabase();
    const numClean = String(data.numero || "").trim();
    const { data: row, error } = await supabase.from("lojas").select("*").eq("numero", numClean).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) {
      // Se não encontrou pelo número exato, tenta com/sem zeros à esquerda
      const stripped = numClean.replace(/^0+/, "");
      if (stripped && stripped !== numClean) {
        const { data: altRow } = await supabase.from("lojas").select("*").eq("numero", stripped).maybeSingle();
        if (altRow) {
          return {
            ...altRow,
            parceiro: altRow.parceiro || getParceiroByLoja(altRow.numero) || null,
          } as Loja;
        }
      }
      return null;
    }
    return {
      ...row,
      parceiro: row.parceiro || getParceiroByLoja(row.numero) || null,
    } as Loja;
  });

export const upsertLoja = createServerFn({ method: "POST" })
  .validator((d: Partial<Loja> & { numero: string }) => d)
  .handler(async ({ data }) => {
    const { requireUnlockedSession: _r } = await import("@/lib/gate.server"); await _r();
    const supabase = (await import("@/integrations/supabase/server-client")).getServerSupabase();
    const numero = String(data.numero || "").trim();
    if (!numero) throw new Error("Número da loja é obrigatório");
    const cnpjDigits = String(data.cnpj || "").replace(/\D/g, "");

    // Regra anti-duplicidade: número da loja
    {
      let q = supabase.from("lojas").select("id").eq("numero", numero);
      if (data.id) q = q.neq("id", data.id);
      const { data: dupNum } = await q.limit(1).maybeSingle();
      if (dupNum) throw new Error(`Já existe uma loja com o número ${numero}.`);
    }

    // Regra anti-duplicidade: CNPJ (comparando só dígitos)
    if (cnpjDigits.length === 14) {
      const { data: all } = await supabase.from("lojas").select("id, cnpj");
      const conflict = (all || []).find((r: any) =>
        String(r.cnpj || "").replace(/\D/g, "") === cnpjDigits && r.id !== data.id
      );
      if (conflict) throw new Error(`Já existe uma loja com o CNPJ ${data.cnpj}.`);
    }

    const parceiroResolved = data.parceiro !== undefined && data.parceiro !== null && String(data.parceiro).trim() !== ""
      ? String(data.parceiro).trim()
      : (getParceiroByLoja(numero) || null);

    const row: any = {
      numero,
      parceiro: parceiroResolved,
      cnpj: data.cnpj?.trim() || null,
      razao_social: data.razao_social?.trim() || null,
      tipo: data.tipo?.trim() || null,
      banco: data.banco?.trim() || null,
      agencia: data.agencia?.trim() || null,
      agencia_dig: data.agencia_dig?.trim() || null,
      conta: data.conta?.trim() || null,
      conta_dig: data.conta_dig?.trim() || null,
      observacao: data.observacao?.trim() || null,
    };

    if (data.id) {
      let { error } = await supabase.from("lojas").update(row).eq("id", data.id);
      if (error && (error.message?.includes("parceiro") || error.code === "PGRST204")) {
        delete row.parceiro;
        const res = await supabase.from("lojas").update(row).eq("id", data.id);
        error = res.error;
      }
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }

    let { data: ins, error } = await supabase.from("lojas").upsert(row, { onConflict: "numero" }).select().single();
    if (error && (error.message?.includes("parceiro") || error.code === "PGRST204")) {
      delete row.parceiro;
      const res = await supabase.from("lojas").upsert(row, { onConflict: "numero" }).select().single();
      ins = res.data;
      error = res.error;
    }
    if (error) throw new Error(error.message);
    return { ok: true, id: ins?.id || "" };
  });

export const deleteLoja = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { requireUnlockedSession: _r } = await import("@/lib/gate.server"); await _r();
    const supabase = (await import("@/integrations/supabase/server-client")).getServerSupabase();
    const { error } = await supabase.from("lojas").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type ChamadoVinculadoLoja = {
  id: string;
  modulo: "faltas" | "recall";
  chamado: string;
  loja: string;
  tipo: string;
  cd: string;
  nf: string;
  situacao: string;
  status_chamado: string;
  status_pagamento: string;
  valor: number;
  dt_abertura: string;
  dt_finalizacao: string | null;
  dt_pagamento: string | null;
};

export const listChamadosByLoja = createServerFn({ method: "GET" })
  .validator((d: { numero: string }) => d)
  .handler(async ({ data }) => {
    const { requireUnlockedSession: _r } = await import("@/lib/gate.server"); await _r();
    const supabase = (await import("@/integrations/supabase/server-client")).getServerSupabase();
    const numClean = String(data.numero || "").trim();
    if (!numClean) return [];

    const numStripped = numClean.replace(/^0+/, "");
    const numPadded = numClean.padStart(3, "0");
    const lojasVariants = Array.from(new Set([numClean, numStripped, numPadded].filter(Boolean)));
    const whereIn = lojasVariants.map((v) => `'${v.replace(/'/g, "''")}'`).join(", ");

    const sql = `
      SELECT 
        'faltas' AS modulo,
        id::text,
        COALESCE(chamado, '')::text AS chamado,
        COALESCE(loja, '')::text AS loja,
        COALESCE(tipo, '')::text AS tipo,
        COALESCE(cd, '')::text AS cd,
        COALESCE(nf, '')::text AS nf,
        COALESCE(situacao, '')::text AS situacao,
        COALESCE(status_chamado, '')::text AS status_chamado,
        COALESCE(status_pagamento, '')::text AS status_pagamento,
        COALESCE(valor, 0)::numeric AS valor,
        dt_abertura::text AS dt_abertura,
        dt_finalizacao::text AS dt_finalizacao,
        dt_pagamento::text AS dt_pagamento
      FROM chamados_faltas
      WHERE TRIM(loja) IN (${whereIn})
      UNION ALL
      SELECT 
        'recall' AS modulo,
        id::text,
        COALESCE(chamado, '')::text AS chamado,
        COALESCE(loja, '')::text AS loja,
        COALESCE(tipo, '')::text AS tipo,
        COALESCE(cd, '')::text AS cd,
        COALESCE(nf, '')::text AS nf,
        COALESCE(situacao, '')::text AS situacao,
        COALESCE(status_chamado, '')::text AS status_chamado,
        COALESCE(status_pagamento, '')::text AS status_pagamento,
        COALESCE(valor, 0)::numeric AS valor,
        dt_abertura::text AS dt_abertura,
        dt_finalizacao::text AS dt_finalizacao,
        dt_pagamento::text AS dt_pagamento
      FROM chamados_recall
      WHERE TRIM(loja) IN (${whereIn})
      ORDER BY dt_abertura DESC NULLS LAST
    `.trim();

    try {
      const { data: result, error } = await supabase.rpc("aiiliana_run_sql", { sql });
      if (!error && Array.isArray(result)) {
        return result.map((r: any) => ({
          ...r,
          valor: Number(r.valor || 0),
        })) as ChamadoVinculadoLoja[];
      }
      if (error) console.warn("[listChamadosByLoja] RPC error:", error);
    } catch (e) {
      console.warn("[listChamadosByLoja] Exception in RPC:", e);
    }

    // Fallback padrão via Supabase JS se a RPC falhar
    const [faltasRes, recallRes] = await Promise.all([
      supabase.from("chamados_faltas").select("*").in("loja", lojasVariants).order("dt_abertura", { ascending: false }),
      supabase.from("chamados_recall").select("*").in("loja", lojasVariants).order("dt_abertura", { ascending: false }),
    ]);

    const combined: ChamadoVinculadoLoja[] = [];
    (faltasRes.data || []).forEach((r: any) => {
      combined.push({
        id: String(r.id),
        modulo: "faltas",
        chamado: String(r.chamado || ""),
        loja: String(r.loja || ""),
        tipo: String(r.tipo || ""),
        cd: String(r.cd || ""),
        nf: String(r.nf || ""),
        situacao: String(r.situacao || ""),
        status_chamado: String(r.status_chamado || ""),
        status_pagamento: String(r.status_pagamento || ""),
        valor: Number(r.valor || 0),
        dt_abertura: String(r.dt_abertura || ""),
        dt_finalizacao: r.dt_finalizacao ? String(r.dt_finalizacao) : null,
        dt_pagamento: r.dt_pagamento ? String(r.dt_pagamento) : null,
      });
    });

    (recallRes.data || []).forEach((r: any) => {
      combined.push({
        id: String(r.id),
        modulo: "recall",
        chamado: String(r.chamado || ""),
        loja: String(r.loja || ""),
        tipo: String(r.tipo || ""),
        cd: String(r.cd || ""),
        nf: String(r.nf || ""),
        situacao: String(r.situacao || ""),
        status_chamado: String(r.status_chamado || ""),
        status_pagamento: String(r.status_pagamento || ""),
        valor: Number(r.valor || 0),
        dt_abertura: String(r.dt_abertura || ""),
        dt_finalizacao: r.dt_finalizacao ? String(r.dt_finalizacao) : null,
        dt_pagamento: r.dt_pagamento ? String(r.dt_pagamento) : null,
      });
    });

    return combined.sort((a, b) => (b.dt_abertura || "").localeCompare(a.dt_abertura || ""));
  });
