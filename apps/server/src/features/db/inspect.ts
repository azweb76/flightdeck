import type { DatabaseSync } from "node:sqlite";
import { TABLE_COLUMNS, V1_ISSUE_COLUMNS, V1_TABLES } from "./schema.ts";

export type ColumnInfo = { name: string };

export function listTables(db: DatabaseSync): string[] {
  const rows = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[];
  return rows.map((row) => row.name);
}

export function tableColumns(db: DatabaseSync, table: string): ColumnInfo[] {
  if (!/^[a-z_]+$/.test(table)) throw new Error("Invalid table name");
  return db.prepare(`PRAGMA table_info(${table})`).all() as ColumnInfo[];
}

export function userVersion(db: DatabaseSync): number {
  const row = db.prepare("PRAGMA user_version").get() as { user_version: number } | undefined;
  return row?.user_version ?? 0;
}

export function missingColumns(db: DatabaseSync): string[] {
  const missing: string[] = [];
  const tables = new Set(listTables(db));
  for (const [table, cols] of Object.entries(TABLE_COLUMNS)) {
    if (!tables.has(table)) {
      missing.push(`${table} (missing table)`);
      continue;
    }
    const have = new Set(tableColumns(db, table).map((c) => c.name));
    for (const col of cols) {
      if (!have.has(col.name)) missing.push(`${table}.${col.name}`);
    }
  }
  return missing;
}

export function isIncompatibleV1(db: DatabaseSync): boolean {
  const tables = new Set(listTables(db));
  if (V1_TABLES.some((name) => tables.has(name))) return true;
  if (!tables.has("issues")) return false;
  const cols = new Set(tableColumns(db, "issues").map((c) => c.name));
  return V1_ISSUE_COLUMNS.some((name) => cols.has(name));
}
