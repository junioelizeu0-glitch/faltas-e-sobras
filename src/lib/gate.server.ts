
import { createHash, timingSafeEqual } from "node:crypto";

export type GateSession = { unlocked?: boolean };

export function sessionConfig() {
  return {
    password: process.env.SESSION_SECRET!,
    name: "site-gate",
    maxAge: 60 * 60 * 24 * 7,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      path: "/",
    },
  };
}

export function safeEq(a: string, b: string) {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

export async function getGateSession() {
  return useSession<GateSession>(sessionConfig());
}

export async function requireUnlockedSession() {
  const session = await getGateSession();
  if (!session.data.unlocked) {
    throw new Error("UNAUTHORIZED");
  }
}
