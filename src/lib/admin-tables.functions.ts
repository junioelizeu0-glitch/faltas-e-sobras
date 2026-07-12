import { createServerFn } from "@tanstack/react-start";

// Tabelas expostas no visualizador. Adicione novas aqui conforme forem criadas.
export const ADMIN_TABLES = ["chamados_faltas"] as const;
export type AdminTable = (typeof ADMIN_TABLES)[number];

async function getSupabase() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const fetchTableRows = createServerFn({ method: "GET" })
  .inputValidator((data: { table: string; limit?: number; search?: string }) => {
    if (!ADMIN_TABLES.includes(data.table as AdminTable)) {
      throw new Error(`Tabela não permitida: ${data.table}`);
    }
    return {
      table: data.table as AdminTable,
      limit: Math.min(Math.max(data.limit ?? 200, 1), 1000),
      search: (data.search ?? "").trim(),
    };
  })
  .handler(async ({ data }) => {
    const { requireUnlockedSession } = await import("@/lib/gate.server"); await requireUnlockedSession();
    const supabase = await getSupabase();
    let query = supabase
      .from(data.table)
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.search) {
      const s = data.search.replace(/[,%]/g, "");
      query = query.or(
        [
          `chamado.ilike.%${s}%`,
          `loja.ilike.%${s}%`,
          `nf.ilike.%${s}%`,
          `transportadora.ilike.%${s}%`,
          `conferente.ilike.%${s}%`,
          `status_chamado.ilike.%${s}%`,
        ].join(","),
      );
    }

    const { data: rows, error, count } = await query;
    if (error) throw new Error(error.message);
    const columns = rows && rows.length > 0 ? Object.keys(rows[0]) : [];
    return { rows: rows ?? [], columns, count: count ?? 0 };
  });
