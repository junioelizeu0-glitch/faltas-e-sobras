import { getRequest, useSession } from "@tanstack/react-start/server";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

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

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET não configurado no servidor.");
  return secret;
}

export function createGateToken() {
  const payload = {
    unlocked: true,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyGateToken(token: string | null) {
  if (!token || !token.includes(".")) return false;
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;
  const expected = createHmac("sha256", getSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return payload?.unlocked === true && Number(payload.exp) > Date.now();
  } catch {
    return false;
  }
}

export function hasGateHeaderToken() {
  const request = getRequest();
  return verifyGateToken(request?.headers?.get("x-site-gate-token") ?? null);
}

export async function requireUnlockedSession() {
  const session = await getGateSession();
  if (!session.data.unlocked && !hasGateHeaderToken()) {
    throw new Error("UNAUTHORIZED");
  }
}
