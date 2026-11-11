import type { MiddlewareHandler } from "hono";

/** Canonical service: Server-Timing + log for API routes (skip long-lived SSE). */
export function apiTiming(): MiddlewareHandler {
  return async (c, next) => {
    if (c.req.path.startsWith("/api/events")) return next();
    const t0 = performance.now();
    await next();
    const ms = Math.round(performance.now() - t0);
    c.header("Server-Timing", `app;dur=${ms}`);
    c.header("X-Response-Time", `${ms}ms`);
    console.info(`timing ${c.req.method} ${c.req.path} ${ms}ms`);
  };
}
