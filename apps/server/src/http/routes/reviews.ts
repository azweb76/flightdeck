import { Hono } from "hono";
import { getReview, listReviews, patchDraft, startDemoReview, startReview, submitReview } from "../../features/pr-review/index.ts";
import { apiError } from "../errors.ts";

export function reviewRoutes(): Hono {
  const app = new Hono();
  app.get("/", (c) => c.json({ reviews: listReviews() }));
  app.post("/", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { repoSlug?: string; prNumber?: number };
    if (body.repoSlug && body.prNumber) return c.json(await startReview(body.repoSlug, body.prNumber), 201);
    if (process.env.FLIGHTDECK_DEMO === "1") return c.json(startDemoReview(), 201);
    throw apiError(400, "missing_pr", "repoSlug and prNumber required");
  });
  app.get("/:id", (c) => {
    const review = getReview(Number(c.req.param("id")));
    if (!review) throw apiError(404, "not_found", "Review not found");
    return c.json(review);
  });
  app.post("/:id/drafts/:draftId", async (c) => {
    const body = (await c.req.json()) as { state: "kept" | "edited" | "discarded" | "pending"; body?: string };
    patchDraft(Number(c.req.param("draftId")), body.state, body.body);
    return c.json(getReview(Number(c.req.param("id"))));
  });
  app.post("/:id/submit", async (c) => {
    await submitReview(Number(c.req.param("id")));
    return c.json(getReview(Number(c.req.param("id"))));
  });
  return app;
}
