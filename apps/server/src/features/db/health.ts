import type { PreflightCheck } from "@flightdeck/shared";
import type { DatabaseSync } from "node:sqlite";
import { getLastBackupPath } from "./backup.ts";
import { missingColumns, userVersion } from "./inspect.ts";
import { SCHEMA_VERSION } from "./schema.ts";

export type SchemaHealth = {
  ok: boolean;
  version: number;
  expected: number;
  missingColumns: string[];
  backupPath?: string;
  detail: string;
};

export function schemaHealth(db: DatabaseSync): SchemaHealth {
  const version = userVersion(db);
  const missing = missingColumns(db);
  const backupPath = getLastBackupPath();
  const ok = version === SCHEMA_VERSION && missing.length === 0;
  return {
    ok,
    version,
    expected: SCHEMA_VERSION,
    missingColumns: missing,
    backupPath,
    detail: healthDetail({ ok, version, missing, backupPath }),
  };
}

export function databasePreflightCheck(db: DatabaseSync): PreflightCheck {
  const health = schemaHealth(db);
  return {
    id: "database",
    label: "SQLite schema",
    severity: "required",
    ok: health.ok,
    status: health.ok ? "pass" : "fail",
    version: String(health.version),
    detail: health.detail,
    fix: health.ok
      ? undefined
      : "Pull the latest Flightdeck and restart. Old databases are migrated in place; v1 files are backed up, not deleted.",
  };
}

function healthDetail(args: {
  ok: boolean;
  version: number;
  missing: string[];
  backupPath?: string;
}): string {
  const backup = args.backupPath ? ` Previous v1 database backed up to ${args.backupPath}.` : "";
  if (args.ok) return `Schema version ${args.version}.${backup}`;
  const missing = args.missing.length ? ` Missing: ${args.missing.join(", ")}.` : "";
  return `Schema version ${args.version} (expected ${SCHEMA_VERSION}).${missing}${backup}`;
}
