import type { Hono } from "hono";
import { loadIssues, syncIssues } from "../../features/issues/index.ts";

export function mountIssues(app: Hono): void {
  app.get("/api/issues", (c) => c.json({ issues: loadIssues() }));
  app.post("/api/issues/sync", async (c) => c.json({ issues: await syncIssues() }));
}
