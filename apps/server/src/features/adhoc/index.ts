import type { Issue, Run } from "@flightdeck/shared";
import { getRepo } from "../repos/index.ts";
import { rememberIssue } from "../issues/index.ts";
import { insertGoal } from "../goals/store.ts";
import { startRun } from "../runs/start.ts";

export async function startAdhoc(repoId: number, title: string, body: string): Promise<Run> {
  const repo = getRepo(repoId);
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
  return startRun({ issueId, repoId });
}
