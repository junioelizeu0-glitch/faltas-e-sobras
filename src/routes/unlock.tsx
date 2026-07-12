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
    <div className="min-h-screen w-full bg-slate-950 lg:grid lg:grid-cols-2">
      {/* Lado da imagem */}
      <div className="relative hidden items-center justify-center overflow-hidden bg-gradient-to-br from-amber-950 via-slate-900 to-slate-950 p-10 lg:flex">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url(${BG_URL})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(8px)",
          }}
        />
        <div className="absolute inset-0 bg-black/40" />
        <img
          src={BG_URL}
          alt="Constance"
          className="relative z-10 max-h-[70vh] w-auto object-contain drop-shadow-2xl"
        />
      </div>

      {/* Lado do formulário */}
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-sm text-center"
        >
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-white shadow-lg ring-1 ring-white/10">
            <img
              src={LOGO_URL}
              alt="Constance"
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white">
            Faltas e Sobras
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Informe usuário e senha
          </p>

          <div className="mt-6 space-y-3 text-left">
            <label className="block text-xs font-medium text-white/80">
              Usuário
              <input
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </label>

            <label className="block text-xs font-medium text-white/80">
              Senha
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </label>
          </div>

          {error && (
            <div className="mt-3 rounded-md border border-red-400/30 bg-red-500/10 p-2 text-xs text-red-200">
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
    </div>

  );
}
