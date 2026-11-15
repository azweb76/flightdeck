import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetBackupPathForTests } from "./backup.ts";
import { closeDb, resetDbForTests } from "./index.ts";
import { tableColumns } from "./inspect.ts";
import { applyMigrations } from "./migrate.ts";

function tmpDb(): string {
  return join(mkdtempSync(join(tmpdir(), "fd-mig-rev-")), "app.sqlite");
}

function writeRaw(path: string, sql: string): void {
  const db = new DatabaseSync(path);
  db.exec(sql);
  db.close();
}

const CORE = `
  CREATE TABLE pr_reviews (
    id TEXT PRIMARY KEY, repo_slug TEXT NOT NULL, number INTEGER NOT NULL, title TEXT NOT NULL,
    url TEXT NOT NULL DEFAULT '', author TEXT NOT NULL DEFAULT '', head_sha TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '', worktree_path TEXT NOT NULL DEFAULT '',
    skill_path TEXT NOT NULL DEFAULT '', cost_usd REAL NOT NULL DEFAULT 0, posted_event TEXT,
    selected INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, demo INTEGER NOT NULL DEFAULT 0
  );
`;

describe("review schema migrations", () => {
  beforeEach(() => resetBackupPathForTests());
  afterEach(() => {
    closeDb();
    resetBackupPathForTests();
  });

  it("adds placement and backfills review cost events from v9", () => {
    const path = tmpDb();
    writeRaw(
      path,
      `${CORE}
      CREATE TABLE pr_review_comments (
        id TEXT PRIMARY KEY, review_id TEXT NOT NULL, path TEXT NOT NULL, line INTEGER NOT NULL,
        side TEXT NOT NULL DEFAULT 'RIGHT', body TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'draft',
        created_at TEXT NOT NULL, demo INTEGER NOT NULL DEFAULT 0
      );
      INSERT INTO pr_reviews (id, repo_slug, number, title, status, cost_usd, created_at, updated_at, demo)
      VALUES ('rev-9', 'acme/web', 9, 'Old', 'drafts', 2.5, '2026-11-14T00:00:00.000Z', '2026-11-16T08:30:00.000Z', 0);
      INSERT INTO pr_review_comments (id, review_id, path, line, body, created_at)
      VALUES ('c-9', 'rev-9', 'a.ts', 1, 'note', '2026-11-14T00:00:00.000Z');`,
    );
    const db = resetDbForTests(path);
    expect(tableColumns(db, "pr_review_comments").map((c) => c.name)).toContain("placement");
    expect((db.prepare("SELECT placement FROM pr_review_comments WHERE id = 'c-9'").get() as { placement: string }).placement).toBe(
      "inline",
    );
    expect(db.prepare("SELECT cost_usd, at FROM pr_review_events WHERE review_id = 'rev-9'").all()).toEqual([
      { cost_usd: 2.5, at: "2026-11-16T08:30:00.000Z" },
    ]);
    applyMigrations(db);
    expect(db.prepare("SELECT COUNT(*) AS n FROM pr_review_events WHERE review_id = 'rev-9'").get()).toEqual({ n: 1 });
  });

  it("backfills pr_review_events from cost_usd on a v10 database", () => {
    const path = tmpDb();
    writeRaw(
      path,
      `${CORE}
      CREATE TABLE pr_review_comments (
        id TEXT PRIMARY KEY, review_id TEXT NOT NULL, path TEXT NOT NULL, line INTEGER NOT NULL,
        side TEXT NOT NULL DEFAULT 'RIGHT', body TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'draft',
        placement TEXT NOT NULL DEFAULT 'inline', created_at TEXT NOT NULL, demo INTEGER NOT NULL DEFAULT 0
      );
      INSERT INTO pr_reviews (id, repo_slug, number, title, status, cost_usd, created_at, updated_at, demo)
      VALUES ('rev-10', 'acme/web', 10, 'Costly', 'drafts', 1.25, '2026-11-14T00:00:00.000Z', '2026-11-15T12:00:00.000Z', 1);`,
    );
    const db = resetDbForTests(path);
    expect(db.prepare("SELECT cost_usd, at, demo FROM pr_review_events WHERE review_id = 'rev-10'").get()).toEqual({
      cost_usd: 1.25,
      at: "2026-11-15T12:00:00.000Z",
      demo: 1,
    });
    applyMigrations(db);
    expect(db.prepare("SELECT COUNT(*) AS n FROM pr_review_events WHERE review_id = 'rev-10'").get()).toEqual({ n: 1 });
  });
});
