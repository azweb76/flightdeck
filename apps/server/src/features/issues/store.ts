import type { Issue } from "@flightdeck/shared";
import { getDb } from "../db/index.ts";

export function upsertIssue(issue: Issue): void {
  getDb()
    .prepare(
      `INSERT INTO issues (id, source, key, title, body, url, repo_slug, updated_at, saved)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         title=excluded.title, body=excluded.body, url=excluded.url,
         repo_slug=excluded.repo_slug, updated_at=excluded.updated_at, saved=excluded.saved`,
    )
    .run(
      issue.id,
      issue.source,
      issue.key,
      issue.title,
      issue.body,
      issue.url,
      issue.repoSlug ?? null,
      issue.updatedAt,
      issue.saved ? 1 : 0,
    );
}

export function loadIssues(): Issue[] {
  const rows = getDb().prepare("SELECT * FROM issues ORDER BY updated_at DESC").all() as Row[];
  return rows.map(fromRow);
}

export function loadIssue(id: string): Issue | undefined {
  const row = getDb().prepare("SELECT * FROM issues WHERE id = ?").get(id) as Row | undefined;
  return row ? fromRow(row) : undefined;
}

type Row = {
  id: string;
  source: Issue["source"];
  key: string;
  title: string;
  body: string;
  url: string;
  repo_slug: string | null;
  updated_at: string;
  saved: number;
};

function fromRow(row: Row): Issue {
  return {
    id: row.id,
    source: row.source,
    key: row.key,
    title: row.title,
    body: row.body,
    url: row.url,
    repoSlug: row.repo_slug ?? undefined,
    updatedAt: row.updated_at,
    saved: row.saved === 1,
  };
}
