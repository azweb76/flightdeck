import { getSettings } from "../settings/index.ts";
import { log } from "./emit.ts";
import { countActive, nextQueued, saveChange } from "./store.ts";

let startQueued: (id: string) => void = () => undefined;

export function setQueueStarter(fn: (id: string) => void): void {
  startQueued = fn;
}

/** Promote queued runs until the concurrent-agent cap is full. */
export function pumpQueue(): void {
  const max = getSettings().maxConcurrentAgents;
  while (countActive() < max) {
    const next = nextQueued();
    if (!next) return;
    next.status = "planning";
    saveChange(next);
    log(next, { kind: "system", title: "dequeue", detail: "A slot opened. Starting this run." });
    startQueued(next.id);
  }
}
