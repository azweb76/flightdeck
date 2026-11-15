import { getCache } from "../cache/index.ts";
import { resetDemoPreflightFixture } from "../preflight/demo.ts";
import { resetPreflightStore, runChecks } from "../preflight/report.ts";
import { rememberRepo } from "../clone/index.ts";
import { getDb } from "../db/index.ts";
import { upsertIssue } from "../issues/store.ts";
import { patchSettings } from "../settings/index.ts";
import { resetDemoGithubMode } from "../github/index.ts";
import { seedIssues } from "./seed-issues.ts";

export { purgeLiveDemoRows } from "./purge.ts";

export function shouldSeed(): boolean {
  return process.env.FLIGHTDECK_DEMO === "1" && process.env.FLIGHTDECK_SEED !== "0";
}

export function seedDemo(): void {
  const count = (getDb().prepare("SELECT COUNT(*) AS n FROM issues").get() as { n: number }).n;
  if (count > 0) return;
  patchSettings({
    jiraSiteUrl: "https://example.atlassian.net",
    jiraEmail: "dan@example.com",
    jiraConfigured: true,
    jiraProjectKey: "PROJ",
    theme: "system",
  });
  rememberRepo("acme", "web", "/tmp/flightdeck-demo/acme/web", true);
  rememberRepo("acme", "api", "/tmp/flightdeck-demo/acme/api", true);
  for (const issue of seedIssues()) upsertIssue({ ...issue, demo: true });
}

export async function resetDemo(opts: { seed: boolean }): Promise<void> {
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
