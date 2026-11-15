const jobs = new Map<string, Promise<void>>();
const held = new Set<string>();
const aborts = new Map<string, AbortController>();
let epoch = 0;

export function bumpRunEpoch(): void {
  epoch += 1;
  jobs.clear();
  held.clear();
  aborts.clear();
}

export function currentRunEpoch(): number {
  return epoch;
}

export function isRunCurrent(started: number): boolean {
  return started === epoch;
}

export function getJob(id: string): Promise<void> | undefined {
  return jobs.get(id);
}

export function hasJob(id: string): boolean {
  return jobs.has(id);
}

export function setJob(id: string, job: Promise<void>): void {
  jobs.set(id, job);
}

export function attachAbort(id: string): AbortController {
  aborts.get(id)?.abort();
  const ac = new AbortController();
  aborts.set(id, ac);
  return ac;
}

export function abortJob(id: string): void {
  aborts.get(id)?.abort();
  aborts.delete(id);
}

export function holdSlot(id: string): void {
  held.add(id);
}

export function isHeld(id: string): boolean {
  return held.has(id);
}

/** Drop in-memory jobs and held demo slots without bumping epoch (simulates an app restart). */
export function dropJobs(): void {
  jobs.clear();
  held.clear();
  aborts.clear();
}
