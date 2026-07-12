import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { unlockSite } from "@/lib/gate.functions";

export const Route = createFileRoute("/unlock")({
  component: UnlockPage,
  head: () => ({ meta: [{ title: "Entrar — Faltas e Sobras" }] }),
});

function UnlockPage() {
  const router = useRouter();
  const unlock = useServerFn(unlockSite);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { ok } = await unlock({ data: { username, password } });
      if (ok) {
        await router.navigate({ to: "/" });
      } else {
        setError("Usuário ou senha incorretos.");
      }
    } catch (err: any) {
      setError(err?.message ?? "Erro ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm"
      >
        <h1 className="text-xl font-bold text-foreground">
          Faltas e Sobras
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acesso restrito. Informe usuário e senha.
        </p>

        <label className="mt-6 block text-xs font-medium">
          Usuário
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </label>

        <label className="mt-3 block text-xs font-medium">
          Senha
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </label>

        {error && (
          <div className="mt-3 rounded border border-red-300 bg-red-50 p-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
