import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ADMIN_TABLES, fetchTableRows } from "@/lib/admin-tables.functions";
import { checkUnlocked } from "@/lib/gate.functions";

export const Route = createFileRoute("/admin/tabelas")({
  beforeLoad: async () => {
    try {
      const { unlocked } = await checkUnlocked();
      if (!unlocked) {
        throw redirect({ to: "/unlock" });
      }
    } catch (e) {
      if (e && typeof e === "object" && ("to" in e || "href" in e || "status" in e || "headers" in e)) {
        throw e;
      }
      console.warn("[beforeLoad /admin/tabelas] SSR error safely bypassed:", e);
    }
  },
  component: TabelasPage,
  head: () => ({ meta: [{ title: "Espelho de Tabelas — Admin" }] }),
  errorComponent: ({ error }) => (
    <div className="p-6 text-red-600">Erro: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6">Não encontrado.</div>,
});

function TabelasPage() {
  const [table, setTable] = useState<string>(ADMIN_TABLES[0]);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(200);
  const [queryText, setQueryText] = useState("");

  const call = useServerFn(fetchTableRows);
  const { data, isFetching, refetch, error } = useQuery({
    queryKey: ["admin-table", table, queryText, limit],
    queryFn: () => call({ data: { table, search: queryText, limit } }),
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link to="/" className="text-sm text-blue-600 hover:underline">
          ← Voltar
        </Link>
        <h1 className="text-xl font-bold">Espelho de Tabelas</h1>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-md border bg-card p-3">
        <label className="flex flex-col text-xs">
          Tabela
          <select
            value={table}
            onChange={(e) => setTable(e.target.value)}
            className="mt-1 rounded border px-2 py-1 text-sm"
          >
            {ADMIN_TABLES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs">
          Buscar (chamado, loja, NF, transp., conferente, status)
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setQueryText(search);
            }}
            placeholder="digite e pressione Enter"
            className="mt-1 w-80 rounded border px-2 py-1 text-sm"
          />
        </label>
        <label className="flex flex-col text-xs">
          Limite
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="mt-1 rounded border px-2 py-1 text-sm"
          >
            {[50, 100, 200, 500, 1000].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={() => {
            setQueryText(search);
            refetch();
          }}
          className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground"
        >
          {isFetching ? "Carregando..." : "Aplicar"}
        </button>
        <div className="ml-auto text-xs text-muted-foreground">
          {data ? `${data.rows.length} de ${data.count} registros` : ""}
        </div>
      </div>

      {error ? (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {(error as Error).message}
        </div>
      ) : null}

      <div className="overflow-auto rounded-md border bg-card">
        <table className="min-w-full text-xs">
          <thead className="sticky top-0 bg-muted">
            <tr>
              {data?.columns.map((c) => (
                <th key={c} className="whitespace-nowrap border-b px-2 py-1.5 text-left font-semibold">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.rows.map((row: any, i: number) => (
              <tr key={row.id ?? i} className="odd:bg-background even:bg-muted/30">
                {data.columns.map((c) => (
                  <td key={c} className="max-w-[280px] truncate whitespace-nowrap border-b px-2 py-1" title={String(row[c] ?? "")}>
                    {formatCell(row[c])}
                  </td>
                ))}
              </tr>
            ))}
            {!isFetching && data && data.rows.length === 0 ? (
              <tr>
                <td className="p-4 text-center text-muted-foreground" colSpan={Math.max(1, data.columns.length)}>
                  Sem registros.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
