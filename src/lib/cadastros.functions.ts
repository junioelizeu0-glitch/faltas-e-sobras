// Server functions dos cadastros mestres: produtos, transportadoras, conferentes, motivos.
import { createServerFn } from "@tanstack/react-start";



// ============ PRODUTOS ============
export type Produto = {
  id: string;
  referencia: string;
  cor: string;
  descricao: string | null;
  nome_parceiro: string | null;
};

export const listProdutos = createServerFn({ method: "GET" })
  .inputValidator((data: { search?: string; limit?: number; offset?: number } | undefined) => data ?? {})
  .handler(async ({ data }) => {
    const { requireUnlockedSession: _r } = await import("@/lib/gate.server"); await _r();
    const supabase = (await import("@/integrations/supabase/server-client")).getServerSupabase();
    const limit = Math.min(data?.limit ?? 100, 500);
    const offset = data?.offset ?? 0;
    let q = supabase.from("produtos").select("*", { count: "exact" });
    const s = (data?.search || "").trim();
    if (s) {
      q = q.or(`referencia.ilike.%${s}%,descricao.ilike.%${s}%,nome_parceiro.ilike.%${s}%,cor.ilike.%${s}%`);
    }
    q = q.order("referencia", { ascending: true }).range(offset, offset + limit - 1);
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return { rows: (rows || []) as Produto[], total: count ?? 0 };
  });

/** Busca ref+cor para autocomplete no formulário. */
export const searchProdutos = createServerFn({ method: "GET" })
  .inputValidator((data: { q: string }) => data)
  .handler(async ({ data }) => {
    const { requireUnlockedSession: _r } = await import("@/lib/gate.server"); await _r();
    const supabase = (await import("@/integrations/supabase/server-client")).getServerSupabase();
    const q = (data.q || "").trim();
    if (!q) return [] as Produto[];
    const { data: rows, error } = await supabase
      .from("produtos")
      .select("*")
      .or(`referencia.ilike.%${q}%,descricao.ilike.%${q}%`)
      .order("referencia", { ascending: true })
      .limit(25);
    if (error) throw new Error(error.message);
    return (rows || []) as Produto[];
  });

export const upsertProduto = createServerFn({ method: "POST" })
  .inputValidator((data: { id?: string; referencia: string; cor: string; descricao?: string; nome_parceiro?: string }) => data)
  .handler(async ({ data }) => {
    const { requireUnlockedSession: _r } = await import("@/lib/gate.server"); await _r();
    const supabase = (await import("@/integrations/supabase/server-client")).getServerSupabase();
    const row = {
      referencia: data.referencia.trim(),
      cor: (data.cor ?? "").trim(),
      descricao: data.descricao?.trim() || null,
      nome_parceiro: data.nome_parceiro?.trim() || null,
    };
    if (!row.referencia) throw new Error("Referência é obrigatória");
    if (data.id) {
      const { error } = await supabase.from("produtos").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: ins, error } = await supabase
      .from("produtos")
      .upsert(row, { onConflict: "referencia,cor" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: ins.id };
  });

export const deleteProduto = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { requireUnlockedSession: _r } = await import("@/lib/gate.server"); await _r();
    const supabase = (await import("@/integrations/supabase/server-client")).getServerSupabase();
    const { error } = await supabase.from("produtos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Bulk upsert (import de planilha). Processa em batches. */
export const bulkUpsertProdutos = createServerFn({ method: "POST" })
  .inputValidator((data: {
    rows: Array<{ referencia: string; cor?: string; descricao?: string; nome_parceiro?: string }>;
  }) => data)
  .handler(async ({ data }) => {
    const { requireUnlockedSession: _r } = await import("@/lib/gate.server"); await _r();
    const supabase = (await import("@/integrations/supabase/server-client")).getServerSupabase();
    const norm = (data.rows || [])
      .map((r) => ({
        referencia: String(r.referencia || "").trim(),
        cor: String(r.cor ?? "").trim(),
        descricao: r.descricao ? String(r.descricao).trim() : null,
        nome_parceiro: r.nome_parceiro ? String(r.nome_parceiro).trim() : null,
      }))
      .filter((r) => r.referencia);
    if (!norm.length) return { ok: true, inserted: 0 };
    const BATCH = 500;
    let total = 0;
    for (let i = 0; i < norm.length; i += BATCH) {
      const slice = norm.slice(i, i + BATCH);
      const { error } = await supabase.from("produtos").upsert(slice, { onConflict: "referencia,cor" });
      if (error) throw new Error(`Erro no batch ${i / BATCH + 1}: ${error.message}`);
      total += slice.length;
    }
    return { ok: true, inserted: total };
  });

/** Exportar tudo (para download em xlsx no cliente). */
export const exportProdutos = createServerFn({ method: "GET" }).handler(async () => {
  const { requireUnlockedSession: _r } = await import("@/lib/gate.server"); await _r();
  const supabase = (await import("@/integrations/supabase/server-client")).getServerSupabase();
  const all: any[] = [];
  const step = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("produtos")
      .select("referencia, cor, descricao, nome_parceiro")
      .order("referencia", { ascending: true })
      .range(from, from + step - 1);
    if (error) throw new Error(error.message);
    all.push(...(data || []));
    if (!data || data.length < step) break;
    from += step;
  }
  return all;
});

// ============ CRUD SIMPLES (só nome) ============
function makeSimpleCrud(table: "transportadoras" | "conferentes" | "motivos") {
  const list = createServerFn({ method: "GET" }).handler(async () => {
    const { requireUnlockedSession: _r } = await import("@/lib/gate.server"); await _r();
    const supabase = (await import("@/integrations/supabase/server-client")).getServerSupabase();
    const { data, error } = await (supabase.from(table) as any).select("*").order("nome");
    if (error) throw new Error(error.message);
    return (data || []) as Array<{ id: string; nome: string }>;
  });
  const upsert = createServerFn({ method: "POST" })
    .inputValidator((d: { id?: string; nome: string }) => d)
    .handler(async ({ data }) => {
      const { requireUnlockedSession: _r } = await import("@/lib/gate.server"); await _r();
      const supabase = (await import("@/integrations/supabase/server-client")).getServerSupabase();
      const nome = (data.nome || "").trim();
      if (!nome) throw new Error("Nome é obrigatório");
      if (data.id) {
        const { error } = await (supabase.from(table) as any).update({ nome }).eq("id", data.id);
        if (error) throw new Error(error.message);
        return { ok: true, id: data.id };
      }
      const { data: ins, error } = await (supabase.from(table) as any).insert({ nome }).select().single();
      if (error) throw new Error(error.message);
      return { ok: true, id: ins.id };
    });
  const del = createServerFn({ method: "POST" })
    .inputValidator((d: { id: string }) => d)
    .handler(async ({ data }) => {
      const { requireUnlockedSession: _r } = await import("@/lib/gate.server"); await _r();
      const supabase = (await import("@/integrations/supabase/server-client")).getServerSupabase();
      const { error } = await (supabase.from(table) as any).delete().eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    });
  return { list, upsert, del };
}

export const {
  list: listTransportadoras,
  upsert: upsertTransportadora,
  del: deleteTransportadora,
} = makeSimpleCrud("transportadoras");

export const {
  list: listConferentes,
  upsert: upsertConferente,
  del: deleteConferente,
} = makeSimpleCrud("conferentes");

export const {
  list: listMotivos,
  upsert: upsertMotivo,
  del: deleteMotivo,
} = makeSimpleCrud("motivos");
