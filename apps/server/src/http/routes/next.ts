import { Hono } from "hono";
import { assembleNext, nextBadge, snapshotFor } from "../../features/next/assemble.ts";
import { getInboxState, upsertInboxState } from "../../features/next/store.ts";
import { startRun } from "../../features/runs/start.ts";
import { startPrFix } from "../../features/board-prs/fix-run.ts";
import { startReview } from "../../features/pr-review/index.ts";
import { listBoardPrs } from "../../features/board-prs/store.ts";
import { apiError } from "../errors.ts";

export function nextRoutes(): Hono {
  const app = new Hono();
  app.get("/", (c) => {
    const items = assembleNext();
    return c.json({ items, badge: nextBadge() });
  });
  app.get("/badge", (c) => c.json({ badge: nextBadge() }));
  app.post("/:id/snooze", async (c) => {
    const id = decodeURIComponent(c.req.param("id"));
    const body = (await c.req.json()) as { until?: string; untilChange?: boolean };
    const cur = getInboxState(id);
    upsertInboxState({
      id,
      snoozeUntil: body.until,
      snoozeUntilChange: Boolean(body.untilChange),
      snapshot: body.untilChange ? snapshotFor(id) : cur?.snapshot,
      done: cur?.done ?? false,
    });
    return c.json({ ok: true });
  });
  app.post("/:id/done", (c) => {
    const id = decodeURIComponent(c.req.param("id"));
    const cur = getInboxState(id);
    upsertInboxState({
      id,
      snoozeUntil: cur?.snoozeUntil,
      snoozeUntilChange: Boolean(cur?.snoozeUntilChange),
      snapshot: cur?.snapshot,
      done: true,
    });
    return c.json({ ok: true });
  });
  app.post("/start", async (c) => {
    const body = (await c.req.json()) as { ids: string[] };
    const runs = [];
    for (const id of body.ids ?? []) {
      const issueId = id.startsWith("issue:") ? id.slice("issue:".length) : id;
      runs.push(await startRun({ issueId }));
    }
    return c.json({ runs }, 201);
  });
  app.post("/:id/fix", async (c) => {
    const id = decodeURIComponent(c.req.param("id")).replace(/^pr:/, "");
    return c.json(await startPrFix(id), 201);
  });
  app.post("/:id/draft-review", async (c) => {
    const id = decodeURIComponent(c.req.param("id")).replace(/^pr:/, "");
    const pr = listBoardPrs().find((p) => p.id === id);
    if (!pr) throw apiError(404, "not_found", "PR not found");
    return c.json(await startReview(pr.repo, pr.number), 201);
  });
  return app;
}
