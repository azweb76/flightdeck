import { randomUUID } from "node:crypto";
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
  backfillDemoFlags(db);
  backfillReviewCostEvents(db);
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

function backfillDemoFlags(db: DatabaseSync): void {
  const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((r) => (r as { name: string }).name));
  if (!tables.has("changes") || !tables.has("issues")) return;
  db.exec(`
    UPDATE changes SET demo = 1 WHERE issue_id IN (SELECT id FROM issues WHERE demo = 1);
  `);
  if (tables.has("change_events")) {
    db.exec(`UPDATE change_events SET demo = 1 WHERE change_id IN (SELECT id FROM changes WHERE demo = 1);`);
  }
}

function backfillReviewCostEvents(db: DatabaseSync): void {
  const tables = new Set(
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((r) => (r as { name: string }).name),
  );
  if (!tables.has("pr_reviews") || !tables.has("pr_review_events")) return;
  const rows = db
    .prepare(
      `SELECT r.id, r.cost_usd, r.updated_at, r.created_at, r.demo
       FROM pr_reviews r
       WHERE r.cost_usd > 0
         AND NOT EXISTS (SELECT 1 FROM pr_review_events e WHERE e.review_id = r.id)`,
    )
    .all() as { id: string; cost_usd: number; updated_at: string; created_at: string; demo: number }[];
  const insert = db.prepare(
    `INSERT INTO pr_review_events (id, review_id, at, kind, title, detail, cost_usd, demo) VALUES (?,?,?,?,?,?,?,?)`,
  );
  for (const row of rows) {
    insert.run(randomUUID(), row.id, row.updated_at || row.created_at, "usage", "usage", null, row.cost_usd, row.demo ?? 0);
  }
}
