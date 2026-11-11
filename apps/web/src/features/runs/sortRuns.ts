import type { Run } from "@flightdeck/shared";

export function sortRuns(runs: Run[]): Run[] {
  return [...runs].sort((a, b) => rank(a) - rank(b) || b.id - a.id);
}

function rank(run: Run): number {
  if (run.status === "asking") return 0;
  if (run.status === "interrupted") return 1;
  if (run.status === "running" || run.status === "queued") return 2;
  return 3;
}

export function elapsedLabel(run: Run, now = Date.now()): string {
  const start = Date.parse(run.startedAt ?? run.createdAt);
  if (!Number.isFinite(start)) return "—";
  const sec = Math.max(0, Math.floor((now - start) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}
