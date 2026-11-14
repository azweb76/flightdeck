import type { PreflightReport } from "@flightdeck/shared";
import { databasePreflightCheck, getDb } from "../db/index.ts";

export function getPreflightReport(): PreflightReport {
  const checks = [databasePreflightCheck(getDb())];
  return {
    ok: checks.filter((c) => c.severity === "required").every((c) => c.ok),
    checkedAt: new Date().toISOString(),
    demo: process.env.FLIGHTDECK_DEMO === "1",
    checks,
  };
}
