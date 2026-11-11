import type { ReviewHandoff } from "./schemas/handoffs.ts";

export type AfterReview = "pr" | "implement" | "plan";

/** Fixed-round loop: open the PR when rounds are spent or the review is clean. */
export function routeAfterReview(
  review: ReviewHandoff,
  round: number,
  maxRounds: number,
): AfterReview {
  if (round >= maxRounds) return "pr";
  if (review.passed && review.findings.length === 0) return "pr";
  if (review.findings.some((f) => f.severity === "major")) return "plan";
  return "implement";
}
