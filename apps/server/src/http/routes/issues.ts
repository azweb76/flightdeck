import type { Hono } from "hono";
import { setIssueRepo, syncIssues } from "../../features/issues/index.ts";
import { fail } from "../errors.ts";

export function mountIssues(app: Hono): void {
  app.get("/api/issues", async (c) => c.json({ issues: await syncIssues() }));
  app.post("/api/issues/sync", async (c) => c.json({ issues: await syncIssues() }));
  app.patch("/api/issues/:id/repo", async (c) => {
    const body = await c.req.json<{ repoSlug?: string }>();
    if (!body.repoSlug) fail("Pick a repo");
    return c.json(setIssueRepo(decodeURIComponent(c.req.param("id")), body.repoSlug));
  });
}
