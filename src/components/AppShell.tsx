import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronLeft, Plus, Search, BarChart2, Package, Truck, UserCheck, FileText, ListChecks, Layers, Store, History, LogOut, Sun, Moon, Sparkles, PanelLeftClose, PanelLeftOpen, Menu, X, Home } from "lucide-react";
import SessionGuard from "@/components/SessionGuard";

interface AppShellProps {
  children: React.ReactNode;
  selectedSubmenu: string | null;
  setSelectedSubmenu: (val: string | null) => void;
}

const LOGO_URL = "https://iili.io/CKolF1t.png";
const groups = [
  { label: "Faltas", keys: ["novo", "consulta", "relatorio"], items: [{ key: "novo", label: "Novo chamado", icon: Plus }, { key: "consulta", label: "Consulta", icon: Search }, { key: "relatorio", label: "Relatórios", icon: BarChart2 }] },
  { label: "Recall", keys: ["recall_novo", "recall_consulta", "recall_relatorio"], items: [{ key: "recall_novo", label: "Novo chamado", icon: Plus }, { key: "recall_consulta", label: "Consulta", icon: Search }, { key: "recall_relatorio", label: "Relatórios", icon: BarChart2 }] },
  { label: "Cadastros", keys: ["cad_lojas", "cad_produtos", "cad_tarefas", "cad_etapas", "cad_transportadoras", "cad_conferentes", "cad_motivos"], items: [{ key: "cad_lojas", label: "Lojas", icon: Store }, { key: "cad_produtos", label: "Produtos", icon: Package }, { key: "cad_tarefas", label: "Situações", icon: ListChecks }, { key: "cad_etapas", label: "Etapas do fluxo", icon: Layers }, { key: "cad_transportadoras", label: "Transportadoras", icon: Truck }, { key: "cad_conferentes", label: "Conferentes", icon: UserCheck }, { key: "cad_motivos", label: "Motivos", icon: FileText }] },
];

function getPageTitle(selectedSubmenu: string | null) {
  if (!selectedSubmenu) return "Visão geral";
  for (const group of groups) {
    const item = group.items.find((entry) => entry.key === selectedSubmenu);
    if (item) return item.label;
  }
  if (selectedSubmenu === "logs") return "Log de alterações";
  if (selectedSubmenu === "aiiliana") return "AIliana";
  return "Visão geral";
}

export default function AppShell({ children, selectedSubmenu, setSelectedSubmenu }: AppShellProps) {
  const [menuAberto, setMenuAberto] = useState(true);
  const [openGroups, setOpenGroups] = useState(["Faltas", "Recall"]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof document !== "undefined") {
      const attr = document.documentElement.getAttribute("data-theme");
      if (attr === "dark" || attr === "light") return attr;
    }
    return "light";
  });

  useEffect(() => {
    if (!selectedSubmenu) return;
    const activeGroup = groups.find((group) => group.keys.includes(selectedSubmenu));
    if (activeGroup) setOpenGroups((current) => current.includes(activeGroup.label) ? current : [...current, activeGroup.label]);
  }, [selectedSubmenu]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch {}
    setTheme(next);
  };
  const navigate = (key: string | null) => { setSelectedSubmenu(key); setMobileMenuOpen(false); };
  const toggleGroup = (label: string) => setOpenGroups((current) => current.includes(label) ? current.filter((item) => item !== label) : [...current, label]);

  return (
    <div className={`app-shell ${menuAberto ? "app-shell-expanded" : "app-shell-collapsed"}`}>
      {mobileMenuOpen && <button className="app-sidebar-backdrop" aria-label="Fechar menu" onClick={() => setMobileMenuOpen(false)} />}
      <aside className={`app-sidebar ${mobileMenuOpen ? "app-sidebar-mobile-open" : ""}`} aria-label="Navegação principal">
        <div className="app-brand-row">
          <button type="button" onClick={() => navigate(null)} className="app-brand" title="Ir para visão geral">
            <span className="app-brand-mark"><img src={LOGO_URL} alt="" referrerPolicy="no-referrer" /></span>
            <span className="app-brand-name">Faltas <span>&amp; Sobras</span></span>
          </button>
          <button className="app-icon-button app-sidebar-collapse" onClick={() => setMenuAberto(false)} aria-label="Recolher navegação"><PanelLeftClose /></button>
          <button className="app-icon-button app-mobile-close" onClick={() => setMobileMenuOpen(false)} aria-label="Fechar navegação"><X /></button>
        </div>
        <nav className="app-navigation">
          <button type="button" onClick={() => navigate(null)} className={`app-nav-home ${selectedSubmenu === null ? "is-active" : ""}`}><Home /><span>Visão geral</span></button>
          {groups.map((group) => {
            const isOpen = openGroups.includes(group.label);
            const isGroupActive = group.keys.includes(selectedSubmenu || "");
            return <section className="app-nav-group" key={group.label}>
              <button type="button" className={`app-nav-group-title ${isGroupActive ? "has-active" : ""}`} onClick={() => toggleGroup(group.label)} aria-expanded={isOpen}>
                <span>{group.label}</span><ChevronDown className={isOpen ? "" : "is-closed"} />
              </button>
              {isOpen && <div className="app-nav-items">{group.items.map((item) => {
                const Icon = item.icon;
                const active = selectedSubmenu === item.key;
                return <button type="button" key={item.key} onClick={() => navigate(item.key)} className={`app-nav-item ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}>
                  <Icon /><span>{item.label}</span>{active && <span className="app-nav-indicator" />}
                </button>;
              })}</div>}
            </section>;
          })}
          <section className="app-nav-group">
            <div className="app-nav-group-title app-nav-label"><span>Sistema</span></div>
            <div className="app-nav-items">
              <button type="button" onClick={() => navigate("aiiliana")} className={`app-nav-item ${selectedSubmenu === "aiiliana" ? "is-active" : ""}`}><Sparkles /><span>AIliana</span></button>
              <button type="button" onClick={() => navigate("logs")} className={`app-nav-item ${selectedSubmenu === "logs" ? "is-active" : ""}`}><History /><span>Log de alterações</span></button>
            </div>
          </section>
        </nav>
        <div className="app-sidebar-footer"><div className="app-status-dot" /><div><strong>Operação ativa</strong><span>Sistema disponível</span></div></div>
      </aside>
      <div className="app-main-column">
        <header className="app-topbar">
          <div className="app-topbar-left">
            <button className="app-icon-button app-mobile-menu" onClick={() => setMobileMenuOpen(true)} aria-label="Abrir navegação"><Menu /></button>
            {!menuAberto && <button className="app-icon-button app-expand-button" onClick={() => setMenuAberto(true)} aria-label="Expandir navegação"><PanelLeftOpen /></button>}
            <div className="app-breadcrumb"><span>Operação</span><ChevronLeft /><strong>{getPageTitle(selectedSubmenu)}</strong></div>
          </div>
          <div className="app-topbar-actions"><span className="app-sync-status"><span /> Dados atualizados</span><span className="app-topbar-divider" />
            <button onClick={toggleTheme} className="app-topbar-action" title={theme === "dark" ? "Trocar para tema claro" : "Trocar para tema escuro"} aria-label="Alternar tema">{theme === "dark" ? <Sun /> : <Moon />}</button>
            <button onClick={() => navigate(null)} className="app-topbar-action app-logout" title="Voltar à visão geral"><LogOut /><span>Sair</span></button>
          </div>
        </header>
        <main className="app-content">{children}</main>
      </div>
      <SessionGuard />
    </div>
  );
}
