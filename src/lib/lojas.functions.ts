import { createServerFn } from "@tanstack/react-start";

export type Loja = {
  id: string;
  numero: string;
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
  return (data || []) as Loja[];
});

export const getLojaByNumero = createServerFn({ method: "GET" })
  .inputValidator((d: { numero: string }) => d)
  .handler(async ({ data }) => {
    const { requireUnlockedSession: _r } = await import("@/lib/gate.server"); await _r();
    const supabase = (await import("@/integrations/supabase/server-client")).getServerSupabase();
    const { data: row, error } = await supabase.from("lojas").select("*").eq("numero", String(data.numero).trim()).maybeSingle();
    if (error) throw new Error(error.message);
    return (row || null) as Loja | null;
  });

export const upsertLoja = createServerFn({ method: "POST" })
  .inputValidator((d: Partial<Loja> & { numero: string }) => d)
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
    const row: any = {
      numero,
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
      const { error } = await supabase.from("lojas").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: ins, error } = await supabase.from("lojas").upsert(row, { onConflict: "numero" }).select().single();
    if (error) throw new Error(error.message);
    return { ok: true, id: ins.id };
  });

export const deleteLoja = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { requireUnlockedSession: _r } = await import("@/lib/gate.server"); await _r();
    const supabase = (await import("@/integrations/supabase/server-client")).getServerSupabase();
    const { error } = await supabase.from("lojas").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
