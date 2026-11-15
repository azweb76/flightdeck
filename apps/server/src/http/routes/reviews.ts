import type { Hono } from "hono";
import { ReviewCommentStateSchema, ReviewVerdictSchema } from "@flightdeck/shared";
import {
  archiveReview,
  chatReview,
  getReview,
  listReviews,
  patchComment,
  postReview,
  refreshReviews,
  selectReview,
  startReview,
} from "../../features/reviews/index.ts";
import { fail } from "../errors.ts";

export function mountReviews(app: Hono): void {
  app.get("/api/reviews", async (c) => c.json({ reviews: await listReviews() }));
  app.post("/api/reviews/refresh", async (c) => c.json({ reviews: await refreshReviews() }));
  app.get("/api/reviews/:id", (c) => {
    const review = getReview(decodeURIComponent(c.req.param("id")));
    if (!review) fail("Review not found", 404);
    return c.json(review);
  });
  app.post("/api/reviews/:id/select", (c) => c.json(selectReview(decodeURIComponent(c.req.param("id")))));
  app.post("/api/reviews/:id/start", async (c) => c.json(await startReview(decodeURIComponent(c.req.param("id")))));
  app.patch("/api/reviews/:id/comments/:commentId", async (c) => {
    const body = await c.req.json<{ body?: string; state?: string }>();
    const state = body.state ? ReviewCommentStateSchema.parse(body.state) : undefined;
    return c.json(patchComment(decodeURIComponent(c.req.param("id")), c.req.param("commentId"), { body: body.body, state }));
  });
  app.post("/api/reviews/:id/post", async (c) => {
    const body = await c.req.json<{ event?: string }>();
    const event = ReviewVerdictSchema.safeParse(body.event);
    if (!event.success) fail("Pick Comment, Approve, or Request changes");
    return c.json(await postReview(decodeURIComponent(c.req.param("id")), event.data));
  });
  app.post("/api/reviews/:id/chat", async (c) => {
    const body = await c.req.json<{ text?: string }>();
    if (!body.text?.trim()) fail("Write a message");
    return c.json(await chatReview(decodeURIComponent(c.req.param("id")), body.text.trim()));
  });
  app.post("/api/reviews/:id/archive", async (c) => c.json(await archiveReview(decodeURIComponent(c.req.param("id")))));
}
