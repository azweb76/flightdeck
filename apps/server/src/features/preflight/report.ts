import type { PreflightCheck, PreflightReport } from "@flightdeck/shared";
import { CACHE_KEYS, getCache } from "../cache/index.ts";
import { databasePreflightCheck, getDb } from "../db/index.ts";
import { publish } from "../events/index.ts";
import { checkClaude } from "./check-claude.ts";
import { checkGithub } from "./check-github.ts";
import { checkJira } from "./check-jira.ts";
import { checkNode } from "./check-node.ts";
import { checkGit, checkPnpm } from "./check-tools.ts";
import { liveContext } from "./context.ts";
import { demoPreflightFixture, demoReport } from "./demo.ts";
import type { PreflightCtx } from "./types.ts";

let stored: PreflightReport | undefined;
let builds = 0;

export function resetPreflightStore(): void {
  stored = undefined;
  builds = 0;
}

export function preflightBuildCount(): number {
  return builds;
}

/** In-memory snapshot. GET never builds. */
export function getPreflightReport(): PreflightReport | undefined {
  return stored;
}

export async function runChecks(): Promise<PreflightReport> {
  getCache().invalidate(CACHE_KEYS.githubStatus);
  getCache().invalidate(CACHE_KEYS.claudeConfig);
  const report = await buildReport();
  builds += 1;
  stored = report;
  return report;
}

export async function buildReport(ctx?: PreflightCtx): Promise<PreflightReport> {
  const resolved = ctx ?? (await liveContext());
  const database = databasePreflightCheck(getDb());
  const demo = demoPreflightFixture();
  if (demo) return demoReport(database, demo);
  const checks = await Promise.all([
    checkNode(resolved),
    checkPnpm(resolved),
    checkGit(resolved),
    checkGithub(),
    checkClaude(resolved),
    checkJira(resolved),
    database,
  ]);
  return toReport(checks, false);
}

export async function recheckPreflight(): Promise<PreflightReport> {
  const report = await runChecks();
  publish("preflight.updated", report);
  return report;
}

export function toReport(checks: PreflightCheck[], demo: boolean, checkedAt = new Date().toISOString()): PreflightReport {
  return {
    ok: checks.filter((c) => c.severity === "required").every((c) => c.ok),
    checkedAt,
    demo,
    checks,
  };
}
