import { createFileRoute, redirect } from "@tanstack/react-router";
import Dashboard from "@/components/Dashboard";
import { checkUnlocked } from "@/lib/gate.functions";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { unlocked } = await checkUnlocked();
    if (!unlocked) throw redirect({ to: "/unlock" });
  },
  component: Index,
});

function Index() {
  return <Dashboard />;
}
