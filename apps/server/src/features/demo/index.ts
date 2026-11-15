import { getCache } from "../cache/index.ts";
import { bumpRunEpoch } from "../run/jobs.ts";
import { resetDemoPreflightFixture } from "../preflight/demo.ts";
import { resetPreflightStore, runChecks } from "../preflight/report.ts";
import { rememberRepo } from "../clone/index.ts";
import { getDb } from "../db/index.ts";
import { upsertIssue } from "../issues/store.ts";
import { resetDemoGithubMode } from "../github/index.ts";
import { purgeLiveDemoRows } from "./purge.ts";
import { seedIssues } from "./seed-issues.ts";

export { purgeLiveDemoRows };

export function shouldSeed(): boolean {
  return process.env.FLIGHTDECK_DEMO === "1" && process.env.FLIGHTDECK_SEED !== "0";
}

/** Seed or purge before the startup preflight snapshot is taken. */
export function applyDemoLifecycle(): void {
  if (shouldSeed()) seedDemo();
  else purgeLiveDemoRows();
}

export function seedDemo(): void {
  const count = (getDb().prepare("SELECT COUNT(*) AS n FROM issues").get() as { n: number }).n;
  if (count > 0) return;
  rememberRepo("acme", "web", "/tmp/flightdeck-demo/acme/web", true);
  rememberRepo("acme", "api", "/tmp/flightdeck-demo/acme/api", true);
  for (const issue of seedIssues()) upsertIssue({ ...issue, demo: true });
}

export async function resetDemo(opts: { seed: boolean }): Promise<void> {
  bumpRunEpoch();
  resetDemoGithubMode();
  resetDemoPreflightFixture();
  resetPreflightStore();
  getCache().invalidate("*");
  getDb().exec(
    "DELETE FROM issues; DELETE FROM repos; DELETE FROM repo_favorites; DELETE FROM repo_recent; DELETE FROM shape_sessions; DELETE FROM settings; DELETE FROM change_events; DELETE FROM changes;",
  );
  if (opts.seed) {
    process.env.FLIGHTDECK_SEED = "1";
    seedDemo();
  } else {
    process.env.FLIGHTDECK_SEED = "0";
  }
  await runChecks();
}
