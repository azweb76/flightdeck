import { jiraProjectKey, resolveRepos, type VisibleRepo } from "@flightdeck/shared";
import { getCatalogRepo } from "../catalog/index.ts";
import { getDb } from "../db/index.ts";
import { createRepo, getRepoBySlug } from "../repos/index.ts";

export function rememberedPicks(projectKey: string): Record<string, VisibleRepo> {
  const rows = getDb()
    .prepare("SELECT label, owner, name FROM label_repo_picks WHERE project_key = ?")
    .all(projectKey) as { label: string; owner: string; name: string }[];
  return Object.fromEntries(rows.map((r) => [r.label, { owner: r.owner, name: r.name }]));
}

export function rememberedPick(projectKey: string, label: string): VisibleRepo | undefined {
  return rememberedPicks(projectKey)[label];
}

export function rememberIssuePick(issueId: string, owner: string, name: string): void {
  getDb()
    .prepare(
      `INSERT INTO issue_repo_picks (issue_id, owner, name, updated_at) VALUES (?,?,?,?)
       ON CONFLICT(issue_id) DO UPDATE SET owner=excluded.owner, name=excluded.name, updated_at=excluded.updated_at`,
    )
    .run(issueId, owner, name, new Date().toISOString());
}

export function rememberedIssuePick(issueId: string): VisibleRepo | undefined {
  return getDb()
    .prepare("SELECT owner, name FROM issue_repo_picks WHERE issue_id = ?")
    .get(issueId) as VisibleRepo | undefined;
}

export function lastProjectRepo(projectKey: string): VisibleRepo | undefined {
  if (!projectKey) return undefined;
  return getDb()
    .prepare(
      `SELECT owner, name FROM issue_repo_picks
       WHERE issue_id LIKE ? ORDER BY updated_at DESC, rowid DESC LIMIT 1`,
    )
    .get(`jira:${projectKey}-%`) as VisibleRepo | undefined;
}

export function rememberPick(projectKey: string, label: string, owner: string, name: string): void {
  getDb()
    .prepare(
      `INSERT INTO label_repo_picks (project_key, label, owner, name, updated_at) VALUES (?,?,?,?,?)
       ON CONFLICT(project_key, label) DO UPDATE SET owner=excluded.owner, name=excluded.name, updated_at=excluded.updated_at`,
    )
    .run(projectKey, label, owner, name, new Date().toISOString());
}

export function ensureRepoRow(owner: string, name: string, localPath = "") {
  const catalog = getCatalogRepo(owner, name);
  return (
    getRepoBySlug(`${owner}/${name}`) ??
    createRepo({
      owner,
      name,
      localPath,
      defaultBranch: catalog?.defaultBranch ?? "main",
    })
  );
}

export class NeedRepoError extends Error {
  constructor(
    public guesses: VisibleRepo[],
    public projectKey: string,
  ) {
    super("Pick a repo for this issue");
    this.name = "NeedRepoError";
  }
}

export function resolveForIssue(
  issueKey: string,
  labels: { owner: string; name: string; label: string }[],
  visible: VisibleRepo[],
) {
  return resolveRepos(labels, visible, rememberedPicks(jiraProjectKey(issueKey)));
}
