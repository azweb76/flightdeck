import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertIssue } from "../issues/store.ts";
import { getLastBackupPath, resetBackupPathForTests } from "./backup.ts";
import { closeDb, databasePreflightCheck, openDb, resetDbForTests, SCHEMA_VERSION, schemaHealth } from "./index.ts";
import { isIncompatibleV1, missingColumns, tableColumns, userVersion } from "./inspect.ts";

function tmpDb(): string {
  return join(mkdtempSync(join(tmpdir(), "fd-mig-")), "app.sqlite");
}

function writeRaw(path: string, sql: string): void {
  const db = new DatabaseSync(path);
  db.exec(sql);
  db.close();
}

const EARLY_V2_ISSUES = `
  CREATE TABLE issues (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    key TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL,
    saved INTEGER NOT NULL DEFAULT 0
  );
  INSERT INTO issues (id, source, key, title, body, url, updated_at, saved)
  VALUES ('jira:PROJ-1', 'jira', 'PROJ-1', 'Old', '', '', '2026-11-10T00:00:00Z', 1);
`;

const V1_SHAPED = `
  CREATE TABLE schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);
  CREATE TABLE runs (id INTEGER PRIMARY KEY, issue_id TEXT NOT NULL);
  CREATE TABLE issues (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    key TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT '',
    parent_id TEXT,
    repos_json TEXT NOT NULL DEFAULT '[]',
    repo_warning TEXT NOT NULL DEFAULT 'none',
    updated_at TEXT NOT NULL
  );
  INSERT INTO schema_migrations (id, applied_at) VALUES ('001_init', '2026-01-01T00:00:00Z');
  INSERT INTO issues (id, source, key, title, body, url, repos_json, updated_at)
  VALUES ('jira:OLD-1', 'jira', 'OLD-1', 'v1 issue', '', '', '[]', '2026-01-01T00:00:00Z');
`;

describe("sqlite migrations", () => {
  beforeEach(() => resetBackupPathForTests());
  afterEach(() => closeDb());

  it("adds issues.repo_slug on an early v2 database so upsert succeeds", () => {
    const path = tmpDb();
    writeRaw(path, EARLY_V2_ISSUES);
    const db = resetDbForTests(path);
    expect(tableColumns(db, "issues").map((c) => c.name)).toContain("repo_slug");
    expect(userVersion(db)).toBe(SCHEMA_VERSION);
    expect(missingColumns(db)).toEqual([]);
    upsertIssue({
      id: "jira:PROJ-1",
      source: "jira",
      key: "PROJ-1",
      title: "Migrated",
      body: "ok",
      url: "",
      repoSlug: "acme/web",
      updatedAt: "2026-11-14T00:00:00Z",
      saved: true,
    });
    const row = db.prepare("SELECT repo_slug, title FROM issues WHERE id = ?").get("jira:PROJ-1") as {
      repo_slug: string;
      title: string;
    };
    expect(row).toEqual({ repo_slug: "acme/web", title: "Migrated" });
    expect(schemaHealth(db).ok).toBe(true);
  });

  it("adds shape_sessions.saved_key when that column is missing", () => {
    const path = tmpDb();
    writeRaw(
      path,
      `
      CREATE TABLE shape_sessions (
        id TEXT PRIMARY KEY,
        repo_slug TEXT NOT NULL,
        issue_id TEXT,
        status TEXT NOT NULL,
        draft_json TEXT NOT NULL,
        messages_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `,
    );
    const db = resetDbForTests(path);
    expect(tableColumns(db, "shape_sessions").map((c) => c.name)).toContain("saved_key");
  });

  it("backs up an incompatible v1 database and opens a fresh v2 schema", () => {
    const path = tmpDb();
    writeRaw(path, V1_SHAPED);
    const probe = new DatabaseSync(path);
    expect(isIncompatibleV1(probe)).toBe(true);
    probe.close();

    const db = resetDbForTests(path);
    const backup = getLastBackupPath();
    expect(backup).toBeTruthy();
    expect(existsSync(backup!)).toBe(true);
    expect(existsSync(path)).toBe(true);

    const old = new DatabaseSync(backup!);
    expect(isIncompatibleV1(old)).toBe(true);
    expect(
      (old.prepare("SELECT title FROM issues WHERE id = ?").get("jira:OLD-1") as { title: string }).title,
    ).toBe("v1 issue");
    old.close();

    expect(userVersion(db)).toBe(SCHEMA_VERSION);
    expect(tableColumns(db, "issues").map((c) => c.name)).toContain("repo_slug");
    expect(db.prepare("SELECT COUNT(*) AS n FROM issues").get() as { n: number }).toEqual({ n: 0 });

    upsertIssue({
      id: "github:acme/web#1",
      source: "github",
      key: "acme/web#1",
      title: "Fresh",
      body: "",
      url: "",
      repoSlug: "acme/web",
      updatedAt: "2026-11-14T00:00:00Z",
      saved: true,
    });
    expect(schemaHealth(db)).toMatchObject({ ok: true, backupPath: backup });
    expect(databasePreflightCheck(db).ok).toBe(true);
    expect(databasePreflightCheck(db).detail).toContain(backup!);
  });

  it("creates a new database at schema version 1", () => {
    const db = openDb(tmpDb());
    expect(userVersion(db)).toBe(1);
    expect(missingColumns(db)).toEqual([]);
    db.close();
  });
});
