import type { PreflightCheck, PreflightReport } from "@flightdeck/shared";
import { CACHE_KEYS, getCache, TTL } from "../cache/index.ts";
import { databasePreflightCheck, getDb } from "../db/index.ts";
import { publish } from "../events/index.ts";
import { checkClaude } from "./check-claude.ts";
import { checkGh } from "./check-gh.ts";
import { checkJira } from "./check-jira.ts";
import { checkNode } from "./check-node.ts";
import { checkGit, checkPnpm } from "./check-tools.ts";
import { liveContext } from "./context.ts";
import { demoPreflightFixture, demoReport } from "./demo.ts";
import type { PreflightCtx } from "./types.ts";

export async function getPreflightReport(opts?: { force?: boolean; ctx?: PreflightCtx }): Promise<PreflightReport> {
  if (opts?.ctx) return buildReport(opts.ctx);
  return getCache().get(CACHE_KEYS.preflight, () => buildReport(), TTL.preflight, { force: opts?.force });
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
    checkGh(resolved),
    checkClaude(resolved),
    checkJira(resolved),
    database,
  ]);
  return toReport(checks, false);
}

export async function recheckPreflight(): Promise<PreflightReport> {
  const report = await getPreflightReport({ force: true });
  publish("preflight.updated", report);
  return report;
}

export function toReport(checks: PreflightCheck[], demo: boolean): PreflightReport {
  return {
    ok: checks.filter((c) => c.severity === "required").every((c) => c.ok),
    checkedAt: new Date().toISOString(),
    demo,
    checks,
  };
}
