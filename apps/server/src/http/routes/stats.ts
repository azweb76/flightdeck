import { Hono } from "hono";
import { statsSummary } from "../../features/stats/index.ts";
import { decideImprovement, listImprovements, reviewSession } from "../../features/improvements/index.ts";
import { apiError } from "../errors.ts";

export function statsRoutes(): Hono {
  const app = new Hono();
  app.get("/", (c) => c.json(statsSummary()));
  app.get("/improvements", (c) => c.json({ improvements: listImprovements() }));
  app.post("/improvements/:id", async (c) => {
    const body = (await c.req.json()) as { status: "approved" | "rejected" | "queued" };
    decideImprovement(Number(c.req.param("id")), body.status);
    return c.json({ ok: true });
  });
  app.post("/runs/:id/session-review", (c) => {
    try {
      return c.json(reviewSession(Number(c.req.param("id"))));
    } catch (err) {
      throw apiError(400, "review_failed", err instanceof Error ? err.message : "failed");
    }
  });
  return app;
}
