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
    <div className="min-h-screen w-full bg-amber-50 lg:grid lg:grid-cols-2">
      {/* Lado da imagem — apenas o fundo */}
      <div className="relative hidden items-center justify-center overflow-hidden lg:flex">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${BG_URL})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(6px) saturate(0.9)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100/80 via-amber-200/70 to-stone-300/80" />
        <div className="absolute inset-0 bg-white/10" />
      </div>

      {/* Lado do formulário */}
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white/90 p-8 shadow-2xl backdrop-blur-sm"
        >
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-white shadow-lg ring-1 ring-stone-200">
            <img
              src={LOGO_URL}
              alt="Constance"
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          <h1 className="text-center text-2xl font-bold tracking-tight text-stone-800">
            Faltas e Sobras
          </h1>
          <p className="mt-1 text-center text-sm text-stone-500">
            Informe usuário e senha
          </p>

          <div className="mt-6 space-y-3 text-left">
            <label className="block text-xs font-medium text-stone-600">
              Usuário
              <input
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
            </label>

            <label className="block text-xs font-medium text-stone-600">
              Senha
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
            </label>
          </div>

          {error && (
            <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-md bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-amber-700 disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
