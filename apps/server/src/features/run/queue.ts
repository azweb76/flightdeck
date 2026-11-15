import { getSettings } from "../settings/index.ts";
import { claimNextQueued } from "./claim.ts";
import { log } from "./emit.ts";
import { hasJob } from "./jobs.ts";
import { countActive } from "./store.ts";

let startQueued: (id: string) => void = () => undefined;
let claimReview: () => { id: string } | undefined = () => undefined;
let startQueuedReview: (id: string) => void = () => undefined;

export function setQueueStarter(fn: (id: string) => void): void {
  startQueued = fn;
}

export function setReviewPump(claim: () => { id: string } | undefined, start: (id: string) => void): void {
  claimReview = claim;
  startQueuedReview = start;
}

/** Promote queued runs and reviews until the concurrent-agent cap is full. */
export function pumpQueue(): void {
  const max = getSettings().maxConcurrentAgents;
  while (countActive() < max) {
    const next = claimNextQueued();
    if (next) {
      log(next, { kind: "system", title: "dequeue", detail: "A slot opened. Starting this run." });
      if (!hasJob(next.id)) startQueued(next.id);
      continue;
    }
    const review = claimReview();
    if (!review) return;
    startQueuedReview(review.id);
  }
}
