import type { BoardPr, Run } from "@flightdeck/shared";
import { getSettings } from "../settings/index.ts";
import { ensureClone } from "../clone/index.ts";
import { ensureRepoRow } from "../discovery/index.ts";
import { enqueue } from "../runs/start.ts";
import { insertRun } from "../runs/store.ts";
import { listBoardPrs } from "./store.ts";
import { loadIssue } from "../issues/store.ts";

export async function startPrFix(prId: string): Promise<Run> {
  const pr = listBoardPrs().find((p) => p.id === prId || `pr:${p.id}` === prId);
  if (!pr) throw new Error("PR not found");
  if (pr.role !== "mine") throw new Error("Fix is only for authored PRs");
  if (!pr.viewerCanPush || pr.isFork) throw new Error("Can't push to this PR head (fork or no write access)");
  const [owner, name] = pr.repo.split("/");
  if (!owner || !name) throw new Error("Bad repo");
  if (process.env.FLIGHTDECK_DEMO !== "1") await ensureClone(owner, name);
  const repo = ensureRepoRow(owner, name);
  const issue = issueFor(pr);
  const settings = getSettings();
  const now = new Date().toISOString();
  const run = insertRun({
    issueId: issue.id,
    issueKey: issue.key,
    issueTitle: issue.title,
    issueSource: issue.source,
    issueUrl: issue.url,
    repoId: repo.id,
    repoSlug: pr.repo,
    branch: pr.headRef,
    worktreePath: "",
    phase: "fix",
    round: 0,
    maxRounds: settings.reviewRounds,
    status: "queued",
    costUsd: 0,
    capUsd: settings.dollarCapUsd,
    prDraft: pr.draft,
    prUrl: pr.url,
    prNumber: pr.number,
    createdAt: now,
    updatedAt: now,
  });
  enqueue(run.id);
  return run;
}

function issueFor(pr: BoardPr): { id: string; key: string; title: string; source: "jira" | "github" | "adhoc"; url: string } {
  for (const id of pr.linkedIssueIds) {
    const hit = loadIssue(id);
    if (hit) return hit;
  }
  return {
    id: `pr:${pr.id}`,
    key: `${pr.repo}#${pr.number}`,
    title: pr.title,
    source: "github",
    url: pr.url,
  };
}
