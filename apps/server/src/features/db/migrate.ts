import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { backupIncompatibleDb } from "./backup.ts";
import { isIncompatibleV1, tableColumns } from "./inspect.ts";
import { CREATE_SQL, SCHEMA_VERSION, TABLE_COLUMNS } from "./schema.ts";

export { SCHEMA_VERSION };

export function migrateOpenFile(path: string): string | undefined {
  if (!existsSync(path)) return undefined;
  const probe = new DatabaseSync(path);
  try {
    if (!isIncompatibleV1(probe)) return undefined;
  } finally {
    probe.close();
  }
  const dest = backupIncompatibleDb(path);
  console.info(`Incompatible v1 database moved to ${dest}. Starting a fresh Flightdeck v2 database.`);
  return dest;
}

export function applyMigrations(db: DatabaseSync): void {
  db.exec(CREATE_SQL);
  addMissingColumns(db);
  db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

function addMissingColumns(db: DatabaseSync): void {
  for (const [table, cols] of Object.entries(TABLE_COLUMNS)) {
    const have = new Set(tableColumns(db, table).map((c) => c.name));
    for (const col of cols) {
      if (!have.has(col.name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col.addSql}`);
    }
  }
}
