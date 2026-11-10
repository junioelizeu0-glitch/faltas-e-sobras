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
