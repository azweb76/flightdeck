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
  assigned?: number;
  closed?: number;
  comments_json?: string;
  via_pr?: number;
  labels_json?: string | null;
  jira_priority?: string | null;
};

export function upsertIssue(issue: Issue, flags?: { assigned?: boolean; closed?: boolean; viaPr?: boolean }): void {
  getDb()
    .prepare(
      `INSERT INTO issues (id, source, key, title, body, url, parent_id, repos_json, repo_warning, updated_at, assigned, closed, comments_json, via_pr, labels_json, jira_priority)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         title=excluded.title, body=excluded.body, url=excluded.url,
         parent_id=excluded.parent_id, repos_json=excluded.repos_json,
         repo_warning=excluded.repo_warning, updated_at=excluded.updated_at,
         assigned=excluded.assigned, closed=excluded.closed,
         comments_json=COALESCE(excluded.comments_json, issues.comments_json),
         via_pr=CASE WHEN excluded.via_pr=1 OR issues.via_pr=1 THEN 1 ELSE 0 END,
         labels_json=excluded.labels_json,
         jira_priority=excluded.jira_priority`,
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
      (flags?.assigned ?? true) ? 1 : 0,
      flags?.closed ? 1 : 0,
      JSON.stringify(issue.comments ?? []),
      (flags?.viaPr ?? issue.viaPr) ? 1 : 0,
      JSON.stringify(issue.labels ?? []),
      issue.jiraPriority ?? null,
    );
}

export function loadIssue(id: string): Issue | undefined {
  const row = getDb().prepare("SELECT * FROM issues WHERE id = ?").get(id) as Row | undefined;
  return row ? fromRow(row) : undefined;
}

export function loadIssues(): Issue[] {
  const rows = getDb()
    .prepare("SELECT * FROM issues WHERE assigned = 1 AND closed = 0 ORDER BY updated_at DESC")
    .all() as Row[];
  return rows.map(fromRow);
}

export function pruneIssues(keepIds: string[]): void {
  const keep = new Set(keepIds);
  const rows = getDb().prepare("SELECT id, source FROM issues").all() as { id: string; source: string }[];
  for (const row of rows) {
    if (row.source === "adhoc") continue;
    if (keep.has(row.id)) continue;
    getDb().prepare("DELETE FROM issues WHERE id = ?").run(row.id);
    getDb().prepare("DELETE FROM issue_comments WHERE issue_id = ?").run(row.id);
  }
}

export function replaceComments(
  issueId: string,
  comments: { id: string; author: string; body: string; createdAt: string }[],
): void {
  const db = getDb();
  db.prepare("DELETE FROM issue_comments WHERE issue_id = ?").run(issueId);
  for (const c of comments) {
    db.prepare(
      "INSERT INTO issue_comments (issue_id, comment_id, author, body, created_at) VALUES (?,?,?,?,?)",
    ).run(issueId, c.id, c.author, c.body, c.createdAt);
  }
  db.prepare("UPDATE issues SET comments_json = ? WHERE id = ?").run(JSON.stringify(comments), issueId);
}

export function loadComments(issueId: string): { id: string; author: string; body: string; createdAt: string }[] {
  const rows = getDb()
    .prepare("SELECT comment_id, author, body, created_at FROM issue_comments WHERE issue_id = ?")
    .all(issueId) as { comment_id: string; author: string; body: string; created_at: string }[];
  return rows.map((r) => ({ id: r.comment_id, author: r.author, body: r.body, createdAt: r.created_at }));
}

function fromRow(row: Row): Issue {
  const comments = row.comments_json ? (JSON.parse(row.comments_json) as Issue["comments"]) : undefined;
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
    comments: comments?.length ? comments : undefined,
    viaPr: row.via_pr === 1,
    labels: row.labels_json ? (JSON.parse(row.labels_json) as string[]) : undefined,
    jiraPriority: row.jira_priority ?? undefined,
  };
}
