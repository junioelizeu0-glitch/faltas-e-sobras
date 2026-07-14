import { createServerFn } from "@tanstack/react-start";

async function getSupabase() {
  const { getServerSupabase } = await import("@/integrations/supabase/server-client");
  return getServerSupabase();
}

export const listAuditLog = createServerFn({ method: "GET" })
  .inputValidator((data: { table?: string; chamado?: string; action?: string; limit?: number } | undefined) => data ?? {})
  .handler(async ({ data }) => {
    const { requireUnlockedSession } = await import("@/lib/gate.server");
    await requireUnlockedSession();
    const supabase = await getSupabase();
    let q = supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(data?.limit ?? 500);
    if (data?.table) q = q.eq("table_name", data.table);
    if (data?.action) q = q.eq("action", data.action);
    if (data?.chamado) q = q.eq("chamado_num", data.chamado);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows || [];
  });
