import { getDb } from "../db/index.ts";

export function statsSummary(filter: { from?: string; to?: string; repo?: string } = {}) {
  const runs = (
    getDb()
      .prepare("SELECT cost_usd, status, repo_slug, round, started_at, finished_at FROM runs")
      .all() as Row[]
  ).filter((r) => inRange(r, filter));
  const spend = runs.reduce((s, r) => s + r.cost_usd, 0);
  const merged = runs.filter((r) => r.status === "completed").length;
  const avgRounds = runs.length === 0 ? 0 : runs.reduce((s, r) => s + r.round, 0) / runs.length;
  const times = runs
    .filter((r) => r.started_at && r.finished_at)
    .map((r) => Date.parse(r.finished_at!) - Date.parse(r.started_at!));
  const avgMs = times.length ? times.reduce((s, n) => s + n, 0) / times.length : 0;
  const byRepo: Record<string, number> = {};
  const byDay: Record<string, number> = {};
  for (const r of runs) {
    byRepo[r.repo_slug] = (byRepo[r.repo_slug] ?? 0) + r.cost_usd;
    const day = (r.started_at ?? r.finished_at ?? "").slice(0, 10);
    if (day) byDay[day] = (byDay[day] ?? 0) + r.cost_usd;
  }
  return {
    spendUsd: Math.round(spend * 100) / 100,
    prsMerged: merged,
    avgRounds: Math.round(avgRounds * 10) / 10,
    avgTimeToPrMs: avgMs,
    costByRepo: Object.entries(byRepo).map(([repo, usd]) => ({ repo, usd })),
    costByDay: Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, usd]) => ({ day, usd })),
    outcomes: {
      merged,
      neededFixes: runs.filter((r) => r.status === "paused").length,
      failed: runs.filter((r) => r.status === "failed").length,
    },
  };
}

type Row = {
  cost_usd: number;
  status: string;
  repo_slug: string;
  round: number;
  started_at: string | null;
  finished_at: string | null;
};

function inRange(r: Row, filter: { from?: string; to?: string; repo?: string }): boolean {
  if (filter.repo && r.repo_slug !== filter.repo) return false;
  const t = r.started_at ?? "";
  if (filter.from && t < filter.from) return false;
  if (filter.to && t > filter.to) return false;
  return true;
}
