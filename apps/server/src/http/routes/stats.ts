import { Hono } from "hono";
import { statsSummary } from "../../features/stats/index.ts";
import {
  decideImprovement,
  getSessionReview,
  listImprovements,
  reviewSession,
} from "../../features/improvements/index.ts";
import { apiError } from "../errors.ts";

export function statsRoutes(): Hono {
  const app = new Hono();
  app.get("/", (c) =>
    c.json(statsSummary({ from: c.req.query("from"), to: c.req.query("to"), repo: c.req.query("repo") })),
  );
  app.get("/improvements", (c) => c.json({ improvements: listImprovements() }));
  app.post("/improvements/:id", async (c) => {
    const body = (await c.req.json()) as { status: "approved" | "rejected" | "queued" };
    decideImprovement(Number(c.req.param("id")), body.status);
    return c.json({ ok: true });
  });
  app.get("/runs/:id/session-review", (c) => {
    const found = getSessionReview(Number(c.req.param("id")));
    if (!found) throw apiError(404, "not_found", "No session review");
    return c.json(found);
  });
  app.post("/runs/:id/session-review", async (c) => {
    try {
      return c.json(await reviewSession(Number(c.req.param("id"))));
    } catch (err) {
      throw apiError(400, "review_failed", err instanceof Error ? err.message : "failed");
    }
  });
  return app;
}
