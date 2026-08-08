import React, { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Plus,
  Search,
  BarChart2,
  Package,
  Truck,
  UserCheck,
  FileText,
  ListChecks,
  Store,
  History,
  LogOut,
  Sun,
  Moon,
  Sparkles,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import { lockSite } from "@/lib/gate.functions";
import SessionGuard from "@/components/SessionGuard";

interface AppShellProps {
  children: React.ReactNode;
  selectedSubmenu: string | null;
  setSelectedSubmenu: (val: string | null) => void;
}

const LOGO_URL = "https://iili.io/CKolF1t.png";

export default function AppShell({
  children,
  selectedSubmenu,
  setSelectedSubmenu,
}: AppShellProps) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [openFaltas, setOpenFaltas] = useState(false);
  const [openCadastros, setOpenCadastros] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof document !== "undefined") {
      const attr = document.documentElement.getAttribute("data-theme");
      if (attr === "dark" || attr === "light") return attr;
    }
    return "light";
  });
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    // 1) Aplica no DOM de forma síncrona (troca visual imediata via CSS vars)
    document.documentElement.setAttribute("data-theme", next);
    // 2) Persiste
    try { localStorage.setItem("theme", next); } catch {}
    // 3) Atualiza state apenas para re-renderizar o ícone do botão
    setTheme(next);
  };
  const lock = useServerFn(lockSite);
  const router = useRouter();
  async function handleLogout() {
    try { sessionStorage.removeItem("tab-session-active"); } catch {}
    window.localStorage.removeItem("site-gate-token");
    try { await lock(); } catch {}
    window.location.href = "/unlock";
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex overflow-hidden">
      {/* Menu Lateral Fixo à Esquerda */}
      <div
        onClick={() => !menuAberto && setMenuAberto(true)}
        className={`bg-white border-r border-slate-200 flex flex-col flex-shrink-0 h-screen select-none transition-all duration-200 ease-in-out ${
          menuAberto ? "w-[220px]" : "w-16 cursor-pointer overflow-x-hidden"
        }`}
      >
        {menuAberto ? (
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Cabeçalho */}
            <div className="p-5 border-b border-slate-100 flex flex-col relative justify-center min-h-[72px]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuAberto(false);
                }}
                className="absolute right-3 top-5 p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title="Recolher menu"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSelectedSubmenu(null); }}
                className="flex items-center gap-2 pr-6 text-left hover:opacity-80 transition-opacity cursor-pointer"
                title="Ir para tela inicial"
              >
                <img
                  src={LOGO_URL}
                  alt="Logo"
                  width={32}
                  height={32}
                  className="w-8 h-8 object-contain shrink-0"
                  referrerPolicy="no-referrer"
                />
                <span className="text-base font-bold text-slate-800 tracking-tight leading-tight">
                  Faltas e
                  <br />
                  Sobras
                </span>
              </button>
            </div>

            {/* Itens do Menu */}
            <div className="flex-1 p-3 space-y-6">
              {/* Grupo Faltas */}
              <div>
                <button
                  type="button"
                  onClick={() => setOpenFaltas((v) => !v)}
                  className={`w-full px-3 py-1 text-xs font-bold uppercase tracking-wider flex items-center justify-between transition-colors hover:text-slate-700 cursor-pointer ${
                    selectedSubmenu && ["novo","consulta","relatorio"].includes(selectedSubmenu) ? "text-blue-600" : "text-slate-400"
                  }`}
                >
                  <span>Faltas</span>
                  {openFaltas ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
                {openFaltas && (
                  <div className="mt-2 space-y-1">
                    {[
                      { k: "novo", label: "Novo Chamado", icon: Plus },
                      { k: "consulta", label: "Consulta", icon: Search },
                      { k: "relatorio", label: "Relatório", icon: BarChart2 },
                    ].map((item) => {
                      const Icon = item.icon;
                      const active = selectedSubmenu === item.k;
                      return (
                        <button
                          key={item.k}
                          onClick={() => { setSelectedSubmenu(item.k); setMenuAberto(false); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${active ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"} cursor-pointer`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Cadastros */}
              <div>
                <button
                  type="button"
                  onClick={() => setOpenCadastros((v) => !v)}
                  className="w-full px-3 py-1 text-xs font-bold uppercase tracking-wider flex items-center justify-between text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <span>Cadastros</span>
                  {openCadastros ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
                {openCadastros && (
                  <div className="mt-2 space-y-1">
                    {[
                      { k: "cad_lojas", label: "Lojas", icon: Store },
                      { k: "cad_produtos", label: "Produtos", icon: Package },
                      { k: "cad_tarefas", label: "Tarefas / Etapas", icon: ListChecks },
                      { k: "cad_transportadoras", label: "Transportadoras", icon: Truck },
                      { k: "cad_conferentes", label: "Conferentes", icon: UserCheck },
                      { k: "cad_motivos", label: "Motivos", icon: FileText },
                    ].map((item) => {
                      const Icon = item.icon;
                      const active = selectedSubmenu === item.k;
                      return (
                        <button
                          key={item.k}
                          onClick={() => { setSelectedSubmenu(item.k); setMenuAberto(false); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${active ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"} cursor-pointer`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sistema */}
              <div>
                <div className="w-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-400">Sistema</div>
                <div className="mt-2 space-y-1">
                  <button
                    onClick={() => { setSelectedSubmenu("aiiliana"); setMenuAberto(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${selectedSubmenu === "aiiliana" ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"} cursor-pointer`}
                  >
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>AIliana (IA)</span>
                  </button>
                  <button
                    onClick={() => { setSelectedSubmenu("logs"); setMenuAberto(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${selectedSubmenu === "logs" ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"} cursor-pointer`}
                  >
                    <History className="w-4 h-4 shrink-0" />
                    <span>Log de Alterações</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full items-center justify-center gap-1">
            <img
              src={LOGO_URL}
              alt="Logo"
              width={32}
              height={32}
              className="w-8 h-8 object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Menu
            </span>
          </div>
        )}
      </div>

      {/* Área de Conteúdo à Direita */}
      <div className="flex-1 flex flex-col min-w-0 h-screen bg-slate-50 overflow-hidden relative">
        <div className="flex justify-end items-center gap-3 px-4 py-2 border-b border-slate-200 bg-white">
          <button
            onClick={toggleTheme}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900"
            title={theme === "dark" ? "Trocar para tema claro" : "Trocar para tema escuro"}
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {theme === "dark" ? "Claro" : "Escuro"}
          </button>
        </div>
        {children}
      </div>
      <SessionGuard />
    </div>
  );
}
