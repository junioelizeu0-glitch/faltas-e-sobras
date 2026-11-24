import { createFileRoute, useNavigate } from "@tanstack/react-router";
import DashboardGerencial from "@/components/DashboardGerencial";
import AppShell from "@/components/AppShell";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "Dashboard Gerencial — Faltas & Sobras" }] }),
});

function DashboardPage() {
  const navigate = useNavigate();

  const handleSelectSubmenu = (val: string | null) => {
    if (val === null) {
      navigate({ to: "/" });
    } else if (val === "dashboard") {
      // Já está no dashboard
    } else {
      window.location.href = `/?submenu=${val}`;
    }
  };

  return (
    <AppShell selectedSubmenu="dashboard" setSelectedSubmenu={handleSelectSubmenu}>
      <DashboardGerencial />
    </AppShell>
  );
}
