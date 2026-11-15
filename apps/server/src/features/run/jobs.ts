const jobs = new Map<string, Promise<void>>();
let epoch = 0;

export function bumpRunEpoch(): void {
  epoch += 1;
  jobs.clear();
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

export function setJob(id: string, job: Promise<void>): void {
  jobs.set(id, job);
}

/** Drop in-memory jobs without bumping epoch (simulates an app restart). */
export function dropJobs(): void {
  jobs.clear();
}
