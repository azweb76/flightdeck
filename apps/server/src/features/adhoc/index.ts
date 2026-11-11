import type { Issue, Run } from "@flightdeck/shared";
import { ensureRepoRow } from "../discovery/index.ts";
import { getRepo } from "../repos/index.ts";
import { rememberIssue } from "../issues/index.ts";
import { insertGoal } from "../goals/store.ts";
import { startRun } from "../runs/start.ts";

export async function startAdhoc(
  title: string,
  body: string,
  opts: { repoId?: number; owner?: string; name?: string },
): Promise<Run> {
  const repo = opts.owner && opts.name ? ensureRepoRow(opts.owner, opts.name) : getRepo(opts.repoId ?? 0);
  if (!repo) throw new Error("Repo not found");
  const issueId = `adhoc:${repo.owner}/${repo.name}:${Date.now()}`;
  const now = new Date().toISOString();
  const issue: Issue = {
    id: issueId,
    source: "adhoc",
    key: `adhoc/${repo.name}`,
    title,
    body,
    url: "",
    stage: "refined",
    repos: [{ owner: repo.owner, name: repo.name, registered: true }],
    repoWarning: "none",
    updatedAt: now,
  };
  rememberIssue(issue);
  insertGoal({
    issueId,
    originalBody: body,
    markdown: `## Goal\n${title}\n\n${body}`,
    status: "approved",
    createdAt: now,
    updatedAt: now,
  });
  return startRun({ issueId, repoId: repo.id });
}
