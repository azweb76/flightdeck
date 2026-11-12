import type { Hono } from "hono";
import { getSession, previewMarkdown, replyShape, saveShapedIssue, startShape } from "../../features/shape/index.ts";
import { fail } from "../errors.ts";

export function mountShape(app: Hono): void {
  app.post("/api/shape", async (c) => {
    const body = await c.req.json<{ repoSlug?: string; issueId?: string; idea?: string }>();
    if (!body.repoSlug) fail("Pick a repo");
    if (!body.issueId && !body.idea?.trim()) fail("Write an idea first");
    return c.json(await startShape({ repoSlug: body.repoSlug, issueId: body.issueId, idea: body.idea }));
  });
  app.get("/api/shape/:id", (c) => {
    const session = getSession(c.req.param("id"));
    if (!session) fail("Session not found", 404);
    return c.json(session);
  });
  app.post("/api/shape/:id/reply", async (c) => {
    const body = await c.req.json<{ text?: string }>();
    if (!body.text?.trim()) fail("Write a reply");
    return c.json(await replyShape(c.req.param("id"), body.text.trim()));
  });
  app.post("/api/shape/:id/save", async (c) => {
    const body = await c.req.json<{ tracker?: "jira" | "github"; projectKey?: string; repoSlug?: string }>();
    if (body.tracker !== "jira" && body.tracker !== "github") fail("Choose Jira or GitHub");
    return c.json(await saveShapedIssue(c.req.param("id"), body.tracker, body));
  });
  app.get("/api/shape/:id/preview", (c) => c.json({ markdown: previewMarkdown(c.req.param("id")) }));
}
