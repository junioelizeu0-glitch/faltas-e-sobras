import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

type GateSession = { unlocked?: boolean };

function sessionConfig() {
  return {
    password: process.env.SESSION_SECRET!,
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

function safeEq(a: string, b: string) {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

export async function requireUnlockedSession() {
  const session = await useSession<GateSession>(sessionConfig());
  if (!session.data.unlocked) {
    throw new Error("UNAUTHORIZED");
  }
}

export const checkUnlocked = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await useSession<GateSession>(sessionConfig());
    return { unlocked: !!session.data.unlocked };
  },
);

export const unlockSite = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => {
    const expectedUser = process.env.SITE_USERNAME;
    const expectedPass = process.env.SITE_PASSWORD;
    if (!expectedUser || !expectedPass) {
      throw new Error("Login não configurado no servidor.");
    }
    const userOk = safeEq(data.username ?? "", expectedUser);
    const passOk = safeEq(data.password ?? "", expectedPass);
    if (!userOk || !passOk) {
      return { ok: false as const };
    }
    const session = await useSession<GateSession>(sessionConfig());
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

export const lockSite = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<GateSession>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});
