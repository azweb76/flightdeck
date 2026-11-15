import { getSettings } from "../settings/index.ts";
import { claimNextQueued } from "./claim.ts";
import { log } from "./emit.ts";
import { countActive } from "./store.ts";

let startQueued: (id: string) => void = () => undefined;

export function setQueueStarter(fn: (id: string) => void): void {
  startQueued = fn;
}

/** Promote queued runs until the concurrent-agent cap is full. */
export function pumpQueue(): void {
  const max = getSettings().maxConcurrentAgents;
  while (countActive() < max) {
    const next = claimNextQueued();
    if (!next) return;
    log(next, { kind: "system", title: "dequeue", detail: "A slot opened. Starting this run." });
    startQueued(next.id);
  }
}
