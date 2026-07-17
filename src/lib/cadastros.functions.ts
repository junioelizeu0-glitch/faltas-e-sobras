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

/** Bulk insert (import de planilha). Insere APENAS itens que ainda não existem (mesma referência+cor). */
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
    if (!norm.length) return { ok: true, inserted: 0, skipped: 0 };

    // Carrega todas as chaves existentes (referencia, cor) em páginas
    const existing = new Set<string>();
    const step = 1000;
    let from = 0;
    while (true) {
      const { data: rows, error } = await supabase
        .from("produtos")
        .select("referencia, cor")
        .range(from, from + step - 1);
      if (error) throw new Error(error.message);
      for (const r of rows || []) existing.add(`${(r as any).referencia}||${(r as any).cor ?? ""}`);
      if (!rows || rows.length < step) break;
      from += step;
    }

    // Deduplicação interna + filtra o que já existe
    const seen = new Set<string>();
    const toInsert: typeof norm = [];
    let skipped = 0;
    for (const r of norm) {
      const k = `${r.referencia}||${r.cor}`;
      if (existing.has(k) || seen.has(k)) { skipped++; continue; }
      seen.add(k);
      toInsert.push(r);
    }
    if (!toInsert.length) return { ok: true, inserted: 0, skipped };

    const BATCH = 500;
    let total = 0;
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const slice = toInsert.slice(i, i + BATCH);
      const { error } = await supabase.from("produtos").insert(slice);
      if (error) throw new Error(`Erro no batch ${i / BATCH + 1}: ${error.message}`);
      total += slice.length;
    }
    return { ok: true, inserted: total, skipped };
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

// ---- TRANSPORTADORAS ----
export const listTransportadoras = createServerFn({ method: "GET" }).handler(async () => {
  const { requireUnlockedSession: _r } = await import("@/lib/gate.server"); await _r();
  const supabase = (await import("@/integrations/supabase/server-client")).getServerSupabase();
  const { data, error } = await supabase.from("transportadoras").select("*").order("nome");
  if (error) throw new Error(error.message);
  return (data || []) as Array<{ id: string; nome: string }>;
});
export const upsertTransportadora = createServerFn({ method: "POST" })
  .inputValidator((d: { id?: string; nome: string }) => d)
  .handler(async ({ data }) => {
    const { requireUnlockedSession: _r } = await import("@/lib/gate.server"); await _r();
    const supabase = (await import("@/integrations/supabase/server-client")).getServerSupabase();
    const nome = (data.nome || "").trim();
    if (!nome) throw new Error("Nome é obrigatório");
    if (data.id) {
      const { error } = await supabase.from("transportadoras").update({ nome }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: ins, error } = await supabase.from("transportadoras").insert({ nome }).select().single();
    if (error) throw new Error(error.message);
    return { ok: true, id: ins.id };
  });
export const deleteTransportadora = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { requireUnlockedSession: _r } = await import("@/lib/gate.server"); await _r();
    const supabase = (await import("@/integrations/supabase/server-client")).getServerSupabase();
    const { error } = await supabase.from("transportadoras").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- CONFERENTES ----
export const listConferentes = createServerFn({ method: "GET" }).handler(async () => {
  const { requireUnlockedSession: _r } = await import("@/lib/gate.server"); await _r();
  const supabase = (await import("@/integrations/supabase/server-client")).getServerSupabase();
  const { data, error } = await supabase.from("conferentes").select("id, nome, cd").order("nome");
  if (error) throw new Error(error.message);
  return (data || []) as Array<{ id: string; nome: string; cd: string | null }>;
});
export const upsertConferente = createServerFn({ method: "POST" })
  .inputValidator((d: { id?: string; nome: string; cd?: string | null }) => d)
  .handler(async ({ data }) => {
    const { requireUnlockedSession: _r } = await import("@/lib/gate.server"); await _r();
    const supabase = (await import("@/integrations/supabase/server-client")).getServerSupabase();
    const nome = (data.nome || "").trim();
    if (!nome) throw new Error("Nome é obrigatório");
    const cd = data.cd ? String(data.cd).trim().toUpperCase() : null;
    const row = { nome, cd } as any;
    if (data.id) {
      const { error } = await supabase.from("conferentes").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: ins, error } = await supabase.from("conferentes").insert(row).select().single();
    if (error) throw new Error(error.message);
    return { ok: true, id: ins.id };
  });
export const deleteConferente = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { requireUnlockedSession: _r } = await import("@/lib/gate.server"); await _r();
    const supabase = (await import("@/integrations/supabase/server-client")).getServerSupabase();
    const { error } = await supabase.from("conferentes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


// ---- MOTIVOS ----
export const listMotivos = createServerFn({ method: "GET" }).handler(async () => {
  const { requireUnlockedSession: _r } = await import("@/lib/gate.server"); await _r();
  const supabase = (await import("@/integrations/supabase/server-client")).getServerSupabase();
  const { data, error } = await supabase.from("motivos").select("*").order("nome");
  if (error) throw new Error(error.message);
  return (data || []) as Array<{ id: string; nome: string }>;
});
export const upsertMotivo = createServerFn({ method: "POST" })
  .inputValidator((d: { id?: string; nome: string }) => d)
  .handler(async ({ data }) => {
    const { requireUnlockedSession: _r } = await import("@/lib/gate.server"); await _r();
    const supabase = (await import("@/integrations/supabase/server-client")).getServerSupabase();
    const nome = (data.nome || "").trim();
    if (!nome) throw new Error("Nome é obrigatório");
    if (data.id) {
      const { error } = await supabase.from("motivos").update({ nome }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: ins, error } = await supabase.from("motivos").insert({ nome }).select().single();
    if (error) throw new Error(error.message);
    return { ok: true, id: ins.id };
  });
export const deleteMotivo = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { requireUnlockedSession: _r } = await import("@/lib/gate.server"); await _r();
    const supabase = (await import("@/integrations/supabase/server-client")).getServerSupabase();
    const { error } = await supabase.from("motivos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

