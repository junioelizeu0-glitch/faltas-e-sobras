import { createFileRoute, redirect } from "@tanstack/react-router";
import Dashboard from "@/components/Dashboard";
import { checkUnlocked } from "@/lib/gate.functions";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    try {
      const { unlocked } = await checkUnlocked();
      if (unlocked === false) {
        throw redirect({ to: "/unlock" });
      }
    } catch (e) {
      if (e && typeof e === "object" && ("to" in e || "href" in e || "status" in e || "headers" in e)) {
        throw e;
      }
      console.warn("[beforeLoad /] SSR checkUnlocked error safely bypassed:", e);
    }
  },
  component: Index,
});

function Index() {
  return <Dashboard />;
}
