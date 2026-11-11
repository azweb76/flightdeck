import { jiraProjectKey, resolveRepos, type VisibleRepo } from "@flightdeck/shared";
import { getDb } from "../db/index.ts";
import { createRepo, getRepoBySlug } from "../repos/index.ts";

export function rememberedPick(projectKey: string): VisibleRepo | undefined {
  const row = getDb()
    .prepare("SELECT owner, name FROM project_repo_picks WHERE project_key = ?")
    .get(projectKey) as { owner: string; name: string } | undefined;
  return row;
}

export function rememberPick(projectKey: string, owner: string, name: string): void {
  getDb()
    .prepare(
      `INSERT INTO project_repo_picks (project_key, owner, name, updated_at) VALUES (?,?,?,?)
       ON CONFLICT(project_key) DO UPDATE SET owner=excluded.owner, name=excluded.name, updated_at=excluded.updated_at`,
    )
    .run(projectKey, owner, name, new Date().toISOString());
}

export function ensureRepoRow(owner: string, name: string, localPath = "") {
  return (
    getRepoBySlug(`${owner}/${name}`) ??
    createRepo({ owner, name, localPath, defaultBranch: "main" })
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
  return resolveRepos(labels, visible, rememberedPick(jiraProjectKey(issueKey)));
}
