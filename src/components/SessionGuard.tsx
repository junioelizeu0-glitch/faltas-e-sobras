import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { lockSite } from "@/lib/gate.functions";

const IDLE_MS = 10 * 60 * 1000; // 10 minutos
const WARN_MS = 60 * 1000; // aviso 60s antes
const TAB_KEY = "tab-session-active";

export default function SessionGuard() {
  const router = useRouter();
  const lock = useServerFn(lockSite);
  const [warnOpen, setWarnOpen] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const loggingOut = useRef(false);

  const doLogout = useCallback(async () => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    try {
      sessionStorage.removeItem(TAB_KEY);
      localStorage.removeItem("site-gate-token");
    } catch {}
    try { await lock(); } catch {}
    await router.navigate({ to: "/unlock" });
  }, [lock, router]);

  const clearTimers = () => {
    if (warnTimer.current) clearTimeout(warnTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    if (tickTimer.current) clearInterval(tickTimer.current);
    warnTimer.current = null;
    logoutTimer.current = null;
    tickTimer.current = null;
  };

  const resetTimers = useCallback(() => {
    clearTimers();
    setWarnOpen(false);
    setCountdown(60);
    warnTimer.current = setTimeout(() => {
      setWarnOpen(true);
      setCountdown(Math.ceil(WARN_MS / 1000));
      tickTimer.current = setInterval(() => {
        setCountdown((c) => (c > 0 ? c - 1 : 0));
      }, 1000);
    }, IDLE_MS - WARN_MS);
    logoutTimer.current = setTimeout(() => {
      void doLogout();
    }, IDLE_MS);
  }, [doLogout]);

  // Enforce per-tab session: se abrir aba nova/reabrir → desloga
  useEffect(() => {
    try {
      if (sessionStorage.getItem(TAB_KEY) !== "1") {
        // sessionStorage vazio = nova aba/reabertura → força login
        void doLogout();
        return;
      }
    } catch {}
    resetTimers();

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart",
    ];
    const onActivity = () => {
      if (!warnOpen) resetTimers();
    };
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!warnOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl dark:bg-stone-900">
        <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100">
          Sessão prestes a expirar
        </h2>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
          Sua sessão vai expirar em <strong>{countdown}s</strong> por inatividade. Deseja
          continuar conectado?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => void doLogout()}
            className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
          >
            Sair agora
          </button>
          <button
            onClick={() => resetTimers()}
            className="rounded-md bg-stone-800 px-3 py-2 text-sm font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900"
          >
            Continuar conectado
          </button>
        </div>
      </div>
    </div>
  );
}

export function markTabSessionActive() {
  try {
    sessionStorage.setItem(TAB_KEY, "1");
  } catch {}
}
