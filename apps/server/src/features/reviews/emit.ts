import type { PrReview } from "@flightdeck/shared";
import { publish } from "../events/index.ts";
import { hasJob, isHeld } from "../run/jobs.ts";
import { getReview } from "./store.ts";

export function isInterruptedReview(review: PrReview): boolean {
  return review.status === "reviewing" && !hasJob(review.id) && !isHeld(review.id);
}

export function presentReview(review: PrReview): PrReview {
  return { ...review, interrupted: isInterruptedReview(review) };
}

export function emitReview(review: PrReview): PrReview {
  const view = presentReview(review);
  publish("review.updated", { id: review.id, review: view });
  return view;
}

export function mustReview(id: string): PrReview {
  const review = getReview(id);
  if (!review) throw new Error("Review not found");
  return review;
}
