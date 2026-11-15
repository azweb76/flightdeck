import type { PrReviewState } from "@flightdeck/shared";

export type ReviewLike = {
  user?: { login?: string | null } | null;
  author?: { login?: string | null } | null;
  state?: string | null;
};

/** Latest review per reviewer. A later approval replaces their changes-requested. */
export function reduceReviews(reviews: ReviewLike[]): PrReviewState {
  const latest = new Map<string, string>();
  for (const review of reviews) {
    const login = review.user?.login ?? review.author?.login ?? "";
    const state = String(review.state ?? "").toUpperCase();
    if (!login || state === "PENDING" || state === "DISMISSED") continue;
    latest.set(login, state);
  }
  const states = [...latest.values()];
  if (states.includes("CHANGES_REQUESTED")) return "changes_requested";
  if (states.includes("APPROVED")) return "approved";
  if (states.includes("COMMENTED")) return "commented";
  return "none";
}
