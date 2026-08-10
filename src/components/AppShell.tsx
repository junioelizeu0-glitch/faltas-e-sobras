import React, { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Menu,
  ArrowLeft,
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

const LOGO_URL = "https://iili.io/CKolF1t.png";

type Props = {
  children: React.ReactNode;
  selectedSubmenu: string | null;
  setSelectedSubmenu: (val: string | null) => void;
};

export default function AppShell({
  children,
  selectedSubmenu,
  setSelectedSubmenu,
}: Props) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [openFaltas, setOpenFaltas] = useState(true);
  const [openCadastros, setOpenCadastros] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof document !== "undefined") {
      const attr = document.documentElement.getAttribute("data-theme");
      if (attr === "dark" || attr === "light") return attr;
    }
    return "light";
  });

  // Escuta evento global de retorno à página principal
  useEffect(() => {
    const handleNavHome = () => setSelectedSubmenu(null);
    window.addEventListener("nav_home", handleNavHome);
    return () => window.removeEventListener("nav_home", handleNavHome);
  }, [setSelectedSubmenu]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch {}
    setTheme(next);
  };

  const lockFn = useServerFn(lockSite);
  const router = useRouter();

  const handleLock = async () => {
    try {
      sessionStorage.removeItem("tab-session-active");
      window.localStorage.removeItem("site-gate-token");
      await lockFn();
      router.navigate({ to: "/unlock" });
    } catch {
      router.navigate({ to: "/unlock" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex overflow-hidden">
      {/* Menu Lateral Fixo à Esquerda */}
      <div
        className={`bg-white border-r border-slate-200 flex flex-col flex-shrink-0 h-screen select-none transition-all duration-200 ease-in-out ${
          menuAberto ? "w-[220px]" : "w-16"
        }`}
      >
        {menuAberto ? (
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Cabeçalho */}
            <div className="p-5 border-b border-slate-100 flex flex-col relative justify-center min-h-[72px]">
              <button
                onClick={() => setMenuAberto(false)}
                className="absolute right-3 top-5 p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title="Recolher menu"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => { setSelectedSubmenu(null); setMenuAberto(false); }}
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
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                            active
                              ? "bg-emerald-50 text-emerald-800 border-l-2 border-emerald-600 shadow-xs"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          } cursor-pointer`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${active ? "text-emerald-700" : "text-slate-400"}`} />
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
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                            active
                              ? "bg-emerald-50 text-emerald-800 border-l-2 border-emerald-600 shadow-xs"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          } cursor-pointer`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${active ? "text-emerald-700" : "text-slate-400"}`} />
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
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      selectedSubmenu === "aiiliana"
                        ? "bg-emerald-50 text-emerald-800 border-l-2 border-emerald-600 shadow-xs"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    } cursor-pointer`}
                  >
                    <Sparkles className={`w-4 h-4 shrink-0 ${selectedSubmenu === "aiiliana" ? "text-emerald-700" : "text-slate-400"}`} />
                    <span>AIliana (IA)</span>
                  </button>
                  <button
                    onClick={() => { setSelectedSubmenu("logs"); setMenuAberto(false); }}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      selectedSubmenu === "logs"
                        ? "bg-emerald-50 text-emerald-800 border-l-2 border-emerald-600 shadow-xs"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    } cursor-pointer`}
                  >
                    <History className={`w-4 h-4 shrink-0 ${selectedSubmenu === "logs" ? "text-emerald-700" : "text-slate-400"}`} />
                    <span>Log de Alterações</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full items-center justify-between py-5">
            {/* Logo no Topo */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setSelectedSubmenu(null); }}
              className="p-1 hover:opacity-80 transition-opacity cursor-pointer"
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
            </button>

            {/* Menu Centralizado na Barra Lateral */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setMenuAberto(true); }}
              className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200/80 hover:border-emerald-200/80 flex flex-col items-center gap-1.5 transition-all shadow-2xs group cursor-pointer"
              title="Abrir menu lateral"
            >
              <Menu className="w-5 h-5 text-slate-600 group-hover:text-emerald-700 transition-colors" />
              <span className="text-[10px] font-bold text-slate-500 group-hover:text-emerald-700 uppercase tracking-wider">
                Menu
              </span>
            </button>

            {/* Espaçador inferior para manter o alinhamento visual */}
            <div className="w-8 h-8 shrink-0" />
          </div>
        )}
      </div>

      {/* Área de Conteúdo à Direita */}
      <div className="flex-1 flex flex-col min-w-0 h-screen bg-[#EAECEB] overflow-hidden relative">
        <div className="flex justify-between items-center px-6 py-3 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <button onClick={() => setSelectedSubmenu(null)} className="text-slate-900 font-semibold hover:text-emerald-700 transition-colors cursor-pointer">
              Faltas e Sobras
            </button>
            {selectedSubmenu && (
              <>
                <span>/</span>
                <span className="capitalize text-emerald-700 font-medium">
                  {selectedSubmenu === "novo" ? "Novo Chamado" : selectedSubmenu.replace("cad_", "Cadastro ").replace("_", " ")}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {selectedSubmenu && (
              <button
                type="button"
                onClick={() => setSelectedSubmenu(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-emerald-700 bg-white border border-slate-200/80 hover:border-emerald-200/80 hover:bg-emerald-50/50 shadow-2xs transition-all cursor-pointer"
                title="Voltar para a página principal"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar ao Início</span>
              </button>
            )}
            <button
              onClick={toggleTheme}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title={theme === "dark" ? "Trocar para tema claro" : "Trocar para tema escuro"}
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-slate-500" />}
              <span>{theme === "dark" ? "Modo Claro" : "Modo Escuro"}</span>
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Sair do sistema"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
        {children}
      </div>
      <SessionGuard />
    </div>
  );
}
