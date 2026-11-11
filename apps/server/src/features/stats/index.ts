import { getDb } from "../db/index.ts";

export function statsSummary() {
  const runs = getDb()
    .prepare("SELECT cost_usd, status, repo_slug, max_rounds, round, started_at, finished_at FROM runs")
    .all() as {
    cost_usd: number;
    status: string;
    repo_slug: string;
    max_rounds: number;
    round: number;
    started_at: string | null;
    finished_at: string | null;
  }[];
  const spend = runs.reduce((s, r) => s + r.cost_usd, 0);
  const merged = runs.filter((r) => r.status === "completed").length;
  const avgRounds =
    runs.length === 0 ? 0 : runs.reduce((s, r) => s + r.round, 0) / runs.length;
  const times = runs
    .filter((r) => r.started_at && r.finished_at)
    .map((r) => Date.parse(r.finished_at!) - Date.parse(r.started_at!));
  const avgMs = times.length ? times.reduce((s, n) => s + n, 0) / times.length : 0;
  const byRepo: Record<string, number> = {};
  for (const r of runs) byRepo[r.repo_slug] = (byRepo[r.repo_slug] ?? 0) + r.cost_usd;
  return {
    spendUsd: Math.round(spend * 100) / 100,
    prsMerged: merged,
    avgRounds: Math.round(avgRounds * 10) / 10,
    avgTimeToPrMs: avgMs,
    costByRepo: Object.entries(byRepo).map(([repo, usd]) => ({ repo, usd })),
    outcomes: {
      merged,
      neededFixes: runs.filter((r) => r.status === "paused").length,
      failed: runs.filter((r) => r.status === "failed").length,
    },
  };
}
