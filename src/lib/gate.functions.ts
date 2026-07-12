import { createServerFn } from "@tanstack/react-start";

export const checkUnlocked = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getGateSession } = await import("./gate.server");
    const session = await getGateSession();
    return { unlocked: !!session.data.unlocked };
  },
);

export const unlockSite = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => {
    const { getGateSession, safeEq } = await import("./gate.server");
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
    const session = await getGateSession();
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

export const lockSite = createServerFn({ method: "POST" }).handler(async () => {
  const { getGateSession } = await import("./gate.server");
  const session = await getGateSession();
  await session.clear();
  return { ok: true as const };
});
