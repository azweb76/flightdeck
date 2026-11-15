import type { PrReview } from "@flightdeck/shared";
import { publish } from "../events/index.ts";
import { hasJob, isHeld } from "../run/jobs.ts";
import { getReview } from "./store.ts";

export function emitReview(review: PrReview): PrReview {
  const interrupted = review.status === "reviewing" && !hasJob(review.id) && !isHeld(review.id);
  const view = { ...review, interrupted };
  publish("review.updated", { id: review.id, review: view });
  return view;
}

export function mustReview(id: string): PrReview {
  const review = getReview(id);
  if (!review) throw new Error("Review not found");
  return review;
}
