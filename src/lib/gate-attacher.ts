import { createMiddleware } from "@tanstack/react-start";

export const attachGateToken = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem("site-gate-token")
        : null;
    return next({
      headers: token ? { "x-site-gate-token": token } : {},
    });
  },
);