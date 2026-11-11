import { unbindLive } from "./live.ts";

const controllers = new Map<number, AbortController>();

export function bindAbort(runId: number): AbortSignal {
  controllers.get(runId)?.abort();
  const c = new AbortController();
  controllers.set(runId, c);
  return c.signal;
}

export function abortRun(runId: number): void {
  controllers.get(runId)?.abort();
  controllers.delete(runId);
  unbindLive(runId);
}

export function clearAbort(runId: number): void {
  controllers.delete(runId);
}
