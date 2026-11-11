import type { Issue } from "@flightdeck/shared";
import { getDb } from "../db/index.ts";

type Row = {
  id: string;
  source: string;
  key: string;
  title: string;
  body: string;
  url: string;
  parent_id: string | null;
  repos_json: string;
  repo_warning: string;
  updated_at: string;
};

export function upsertIssue(issue: Issue): void {
  getDb()
    .prepare(
      `INSERT INTO issues (id, source, key, title, body, url, parent_id, repos_json, repo_warning, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         title=excluded.title, body=excluded.body, url=excluded.url,
         parent_id=excluded.parent_id, repos_json=excluded.repos_json,
         repo_warning=excluded.repo_warning, updated_at=excluded.updated_at`,
    )
    .run(
      issue.id,
      issue.source,
      issue.key,
      issue.title,
      issue.body,
      issue.url,
      issue.parentId ?? null,
      JSON.stringify(issue.repos),
      issue.repoWarning,
      issue.updatedAt,
    );
}

export function loadIssue(id: string): Issue | undefined {
  const row = getDb().prepare("SELECT * FROM issues WHERE id = ?").get(id) as Row | undefined;
  return row ? fromRow(row) : undefined;
}

export function loadIssues(): Issue[] {
  const rows = getDb().prepare("SELECT * FROM issues ORDER BY updated_at DESC").all() as Row[];
  return rows.map(fromRow);
}

function fromRow(row: Row): Issue {
  return {
    id: row.id,
    source: row.source as Issue["source"],
    key: row.key,
    title: row.title,
    body: row.body,
    url: row.url,
    stage: "new",
    repos: JSON.parse(row.repos_json) as Issue["repos"],
    repoWarning: row.repo_warning as Issue["repoWarning"],
    updatedAt: row.updated_at,
    parentId: row.parent_id ?? undefined,
  };
}
