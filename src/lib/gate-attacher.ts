import { createMiddleware } from "@tanstack/react-start";

export const attachGateToken = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const token = window.localStorage.getItem("site-gate-token");
    return next({
      headers: token ? { "x-site-gate-token": token } : {},
    });
  },
);