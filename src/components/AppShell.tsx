import React, { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  Plus,
  Search,
  BarChart2,
  Package,
  Truck,
  UserCheck,
  FileText,
  ListChecks,
  Layers,
  Store,
  History,
  LogOut,
  Sun,
  Moon,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  Home,
  RefreshCcw,
  Sliders,
} from "lucide-react";
import SessionGuard from "@/components/SessionGuard";

interface AppShellProps {
  children: React.ReactNode;
  selectedSubmenu: string | null;
  setSelectedSubmenu: (val: string | null) => void;
}

const LOGO_URL = "https://iili.io/CKolF1t.png";

const groups = [
  {
    label: "Faltas e Sobras",
    icon: Package,
    keys: ["novo", "consulta", "relatorio"],
    items: [
      { key: "novo", label: "Novo chamado", icon: Plus },
      { key: "consulta", label: "Consulta", icon: Search },
      { key: "relatorio", label: "Relatórios", icon: BarChart2 },
    ],
  },
  {
    label: "Recall",
    icon: RefreshCcw,
    keys: ["recall_novo", "recall_consulta", "recall_relatorio"],
    items: [
      { key: "recall_novo", label: "Novo chamado", icon: Plus },
      { key: "recall_consulta", label: "Consulta", icon: Search },
      { key: "recall_relatorio", label: "Relatórios", icon: BarChart2 },
    ],
  },
  {
    label: "Cadastros",
    icon: Sliders,
    keys: [
      "cad_lojas",
      "cad_produtos",
      "cad_tarefas",
      "cad_etapas",
      "cad_transportadoras",
      "cad_conferentes",
      "cad_motivos",
    ],
    items: [
      { key: "cad_lojas", label: "Lojas", icon: Store },
      { key: "cad_produtos", label: "Produtos", icon: Package },
      { key: "cad_tarefas", label: "Situações", icon: ListChecks },
      { key: "cad_etapas", label: "Etapas do fluxo", icon: Layers },
      { key: "cad_transportadoras", label: "Transportadoras", icon: Truck },
      { key: "cad_conferentes", label: "Conferentes", icon: UserCheck },
      { key: "cad_motivos", label: "Motivos", icon: FileText },
    ],
  },
];

function getPageTitle(selectedSubmenu: string | null) {
  if (!selectedSubmenu) return "Visão geral";
  for (const group of groups) {
    const item = group.items.find((entry) => entry.key === selectedSubmenu);
    if (item) return `${group.label} › ${item.label}`;
  }
  if (selectedSubmenu === "logs") return "Sistema › Log de alterações";
  if (selectedSubmenu === "aiiliana") return "Sistema › AIliana";
  return "Visão geral";
}

export default function AppShell({
  children,
  selectedSubmenu,
  setSelectedSubmenu,
}: AppShellProps) {
  // Desktop (> 1024px): menu expandido normalmente
  // Tablet (<= 1024px): menu recolhível (inicia recolhido para otimizar espaço de tabelas e gráficos)
  const [menuAberto, setMenuAberto] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth > 1024;
    }
    return true;
  });

  // Fecha drawer mobile ao redimensionar tela
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined" && window.innerWidth <= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Inicialmente fechados: as opções SÓ aparecem se clicarem no menu!
  // Se houver rota selecionada, abre o grupo daquela rota.
  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    if (!selectedSubmenu) return [];
    if (["aiiliana", "logs"].includes(selectedSubmenu)) return ["Sistema"];
    const activeGroup = groups.find((group) => group.keys.includes(selectedSubmenu));
    return activeGroup ? [activeGroup.label] : [];
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof document !== "undefined") {
      const attr = document.documentElement.getAttribute("data-theme");
      if (attr === "dark" || attr === "light") return attr;
    }
    return "light";
  });

  // Mantém aberto o grupo da opção atual caso o usuário navegue
  useEffect(() => {
    if (!selectedSubmenu) return;
    if (["aiiliana", "logs"].includes(selectedSubmenu)) {
      setOpenGroups((curr) => (curr.includes("Sistema") ? curr : [...curr, "Sistema"]));
      return;
    }
    const activeGroup = groups.find((group) => group.keys.includes(selectedSubmenu));
    if (activeGroup) {
      setOpenGroups((current) =>
        current.includes(activeGroup.label) ? current : [...current, activeGroup.label]
      );
    }
  }, [selectedSubmenu]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setTheme(next);
  };

  const navigate = (key: string | null) => {
    setSelectedSubmenu(key);
    setMobileMenuOpen(false);
  };

  const toggleGroup = (label: string) => {
    if (!menuAberto) {
      setMenuAberto(true);
    }
    setOpenGroups((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label]
    );
  };

  return (
    <div className={`app-shell ${menuAberto ? "app-shell-expanded" : "app-shell-collapsed"}`}>
      {mobileMenuOpen && (
        <button
          className="app-sidebar-backdrop"
          aria-label="Fechar menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`app-sidebar ${mobileMenuOpen ? "app-sidebar-mobile-open" : ""}`}
        aria-label="Navegação principal"
      >
        {/* Brand / Logo */}
        <div className="app-brand-row">
          <button
            type="button"
            onClick={() => navigate(null)}
            className="app-brand"
            title="Ir para visão geral"
          >
            <span className="app-brand-mark">
              <img src={LOGO_URL} alt="" referrerPolicy="no-referrer" />
            </span>
            <span className="app-brand-name">
              Faltas <span>&amp; Sobras</span>
            </span>
          </button>
          <button
            className="app-icon-button app-sidebar-collapse"
            onClick={() => setMenuAberto(false)}
            aria-label="Recolher navegação"
            title="Recolher navegação"
          >
            <PanelLeftClose />
          </button>
          <button
            className="app-icon-button app-mobile-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Fechar navegação"
          >
            <X />
          </button>
        </div>

        {/* Navegação com Menus e Submenus retráteis */}
        <nav className="app-navigation">
          {/* Botão de Visão Geral (Home) */}
          <button
            type="button"
            onClick={() => navigate(null)}
            className={`app-nav-home ${selectedSubmenu === null ? "is-active" : ""}`}
          >
            <Home className="w-4 h-4 shrink-0" />
            <span>Visão geral</span>
          </button>

          {/* Menus Principais: Faltas e Sobras, Recall, Cadastros */}
          {groups.map((group) => {
            const isOpen = openGroups.includes(group.label);
            const isGroupActive = group.keys.includes(selectedSubmenu || "");
            const GroupIcon = group.icon;

            return (
              <section className="app-nav-group" key={group.label}>
                <button
                  type="button"
                  className={`app-nav-group-btn ${isGroupActive ? "has-active" : ""} ${isOpen ? "is-open" : ""}`}
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={isOpen}
                  title={`Clique para ${isOpen ? "recolher" : "abrir"} as opções de ${group.label}`}
                >
                  <div className="app-nav-group-left">
                    <GroupIcon className="app-nav-group-icon" />
                    <span className="app-nav-group-text">{group.label}</span>
                  </div>
                  <ChevronDown className={`app-nav-group-arrow ${isOpen ? "is-open" : ""}`} />
                </button>

                {/* Submenus: Só aparecem se clicarem no menu! */}
                {isOpen && (
                  <div className="app-nav-subitems">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = selectedSubmenu === item.key;
                      return (
                        <button
                          type="button"
                          key={item.key}
                          onClick={() => navigate(item.key)}
                          className={`app-nav-subitem ${active ? "is-active" : ""}`}
                          aria-current={active ? "page" : undefined}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span>{item.label}</span>
                          {active && <span className="app-nav-indicator" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}

          {/* Menu Sistema (AIliana, Logs) retrátil */}
          <section className="app-nav-group">
            <button
              type="button"
              className={`app-nav-group-btn ${["aiiliana", "logs"].includes(selectedSubmenu || "") ? "has-active" : ""} ${openGroups.includes("Sistema") ? "is-open" : ""}`}
              onClick={() => toggleGroup("Sistema")}
              aria-expanded={openGroups.includes("Sistema")}
              title={`Clique para ${openGroups.includes("Sistema") ? "recolher" : "abrir"} as opções de Sistema`}
            >
              <div className="app-nav-group-left">
                <Sparkles className="app-nav-group-icon" />
                <span className="app-nav-group-text">Sistema</span>
              </div>
              <ChevronDown className={`app-nav-group-arrow ${openGroups.includes("Sistema") ? "is-open" : ""}`} />
            </button>

            {openGroups.includes("Sistema") && (
              <div className="app-nav-subitems">
                <button
                  type="button"
                  onClick={() => navigate("aiiliana")}
                  className={`app-nav-subitem ${selectedSubmenu === "aiiliana" ? "is-active" : ""}`}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>AIliana</span>
                  {selectedSubmenu === "aiiliana" && <span className="app-nav-indicator" />}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("logs")}
                  className={`app-nav-subitem ${selectedSubmenu === "logs" ? "is-active" : ""}`}
                >
                  <History className="w-3.5 h-3.5 shrink-0" />
                  <span>Log de alterações</span>
                  {selectedSubmenu === "logs" && <span className="app-nav-indicator" />}
                </button>
              </div>
            )}
          </section>
        </nav>

        {/* Rodapé da Sidebar */}
        <div className="app-sidebar-footer">
          <div className="app-status-dot" />
          <div>
            <strong>Operação ativa</strong>
            <span>Sistema disponível</span>
          </div>
        </div>
      </aside>

      {/* Coluna Principal */}
      <div className="app-main-column">
        <header className="app-topbar">
          <div className="app-topbar-left">
            <button
              className="app-icon-button app-mobile-menu"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir navegação"
            >
              <Menu />
            </button>
            {!menuAberto && (
              <button
                className="app-icon-button app-expand-button"
                onClick={() => setMenuAberto(true)}
                aria-label="Expandir navegação"
                title="Expandir navegação"
              >
                <PanelLeftOpen />
              </button>
            )}
            <div className="app-breadcrumb">
              <span>Operação</span>
              <ChevronLeft />
              <strong>{getPageTitle(selectedSubmenu)}</strong>
            </div>
          </div>

          <div className="app-topbar-actions">
            <span className="app-sync-status">
              <span /> Dados atualizados
            </span>
            <span className="app-topbar-divider" />
            <button
              onClick={toggleTheme}
              className="app-topbar-action"
              title={theme === "dark" ? "Trocar para tema claro" : "Trocar para tema escuro"}
              aria-label="Alternar tema"
            >
              {theme === "dark" ? <Sun /> : <Moon />}
            </button>
            <button
              onClick={() => navigate(null)}
              className="app-topbar-action app-logout"
              title="Voltar à visão geral"
            >
              <LogOut />
              <span>Sair</span>
            </button>
          </div>
        </header>

        <main className="app-content">{children}</main>
      </div>

      <SessionGuard />
    </div>
  );
}
