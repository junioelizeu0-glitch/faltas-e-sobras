
import { createHash, timingSafeEqual } from "node:crypto";

export type GateSession = { unlocked?: boolean };

export function sessionConfig() {
  const secret = process.env.SESSION_SECRET || "faltas-e-sobras-session-secret-key-32chars-minimum";
  return {
    password: secret,
    name: "site-gate",
    maxAge: 60 * 60 * 24 * 7,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

export function safeEq(a: string, b: string) {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

import { useSession } from "@tanstack/react-start/server";

export async function getGateSession() {
  return useSession<GateSession>(sessionConfig());
}




export async function requireUnlockedSession() {
  const session = await getGateSession();
  if (!session.data.unlocked) {
    throw new Error("UNAUTHORIZED");
  }
}
