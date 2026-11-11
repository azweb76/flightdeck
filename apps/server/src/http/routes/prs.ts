import { Hono } from "hono";
import { startPrFix } from "../../features/board-prs/fix-run.ts";
import { startReview } from "../../features/pr-review/index.ts";
import { readPrDiag } from "../../features/board-prs/index.ts";
import { listBoardPrs } from "../../features/board-prs/store.ts";
import { apiError } from "../errors.ts";

export function prRoutes(): Hono {
  const app = new Hono();
  app.get("/", (c) => c.json({ prs: listBoardPrs() }));
  app.get("/diagnostics", (c) => c.json(readPrDiag()));
  app.post("/:id/fix", async (c) => {
    try {
      return c.json(await startPrFix(decodeURIComponent(c.req.param("id"))), 201);
    } catch (err) {
      throw apiError(400, "pr_fix_failed", err instanceof Error ? err.message : "fix failed");
    }
  });
  app.post("/:id/draft-review", async (c) => {
    const pr = listBoardPrs().find((p) => p.id === decodeURIComponent(c.req.param("id")));
    if (!pr) throw apiError(404, "not_found", "PR not found");
    return c.json(await startReview(pr.repo, pr.number), 201);
  });
  return app;
}
