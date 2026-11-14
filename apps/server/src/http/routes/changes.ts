import type { Hono } from "hono";
import { archiveChange, getChange, listChanges, replyChange, startChange } from "../../features/run/index.ts";
import { fail } from "../errors.ts";

export function mountChanges(app: Hono): void {
  app.get("/api/changes", (c) => c.json({ changes: listChanges() }));
  app.post("/api/changes", async (c) => {
    const body = await c.req.json<{ issueId?: string }>();
    if (!body.issueId) fail("Pick an issue");
    return c.json(await startChange(body.issueId));
  });
  app.get("/api/changes/:id", (c) => {
    const change = getChange(c.req.param("id"));
    if (!change) fail("Change not found", 404);
    return c.json(change);
  });
  app.post("/api/changes/:id/reply", async (c) => {
    const body = await c.req.json<{ text?: string }>();
    if (!body.text?.trim()) fail("Write a reply");
    return c.json(await replyChange(c.req.param("id"), body.text.trim()));
  });
  app.post("/api/changes/:id/archive", async (c) => c.json(await archiveChange(c.req.param("id"))));
}
