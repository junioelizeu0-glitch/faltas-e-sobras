
import { createHash, timingSafeEqual } from "node:crypto";

export type GateSession = { unlocked?: boolean };

export function sessionConfig() {
  const secret =
    process.env.SESSION_SECRET ||
    "complex_password_at_least_32_characters_long_for_session_security";
  return {
    password: secret,
    name: "site-gate",
    maxAge: 60 * 60 * 24 * 7,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
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
  // Tela de login desativada: acesso livre
  return;
}
