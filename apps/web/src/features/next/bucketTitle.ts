import type { NextBucket } from "@flightdeck/shared";

export const BUCKET_TITLE: Record<NextBucket, string> = {
  waiting: "Waiting on you",
  fix_prs: "Your PRs need work",
  review: "Review requests",
  issues: "Assigned issues",
};
