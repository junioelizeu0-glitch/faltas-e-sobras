import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { unlockSite } from "@/lib/gate.functions";

const LOGO_URL = "https://iili.io/CKolF1t.png";
const BG_URL = "https://i.ibb.co/GfBXZ22J/pilao-original.avif";

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
    <div
      className="relative flex min-h-screen items-center justify-center px-4"
      style={{
        backgroundImage: `url(${BG_URL})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* overlay para contraste */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <form
        onSubmit={onSubmit}
        className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-white/10 p-8 text-center shadow-2xl backdrop-blur-xl"
      >
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-white/95 shadow-lg ring-2 ring-white/40">
          <img
            src={LOGO_URL}
            alt="Constance"
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow">
          Faltas e Sobras
        </h1>
        <p className="mt-1 text-sm text-white/80">
          Informe usuário e senha
        </p>

        <div className="mt-6 space-y-3 text-left">
          <label className="block text-xs font-medium text-white/90">
            Usuário
            <input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="mt-1 w-full rounded-md border border-white/20 bg-white/95 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </label>

          <label className="block text-xs font-medium text-white/90">
            Senha
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-1 w-full rounded-md border border-white/20 bg-white/95 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </label>
        </div>

        {error && (
          <div className="mt-3 rounded-md border border-red-300/40 bg-red-500/20 p-2 text-xs text-red-100">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow transition hover:bg-white/90 disabled:opacity-60"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
