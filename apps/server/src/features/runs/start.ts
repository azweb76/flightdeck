import type { Issue, Run, StartRun } from "@flightdeck/shared";
import { getSettings } from "../settings/index.ts";
import { getRepo, getRepoBySlug, listRepos } from "../repos/index.ts";
import { getIssue } from "../issues/index.ts";
import { latestGoal } from "../goals/store.ts";
import { ensureWorktree } from "../worktree/index.ts";
import { publish } from "../events/index.ts";
import { notify } from "../notify/index.ts";
import { activeRunCount, insertRun, updateRun, getRun } from "./store.ts";
import { runAgentPhase } from "./execute.ts";
import { openPullRequest } from "./pr.ts";
import { orchestrate } from "./orchestrate.ts";
import { buildFixPrompt } from "./fix.ts";

const queue: number[] = [];
let pumping = false;

export async function startRun(input: StartRun): Promise<Run> {
  const issue = await getIssue(input.issueId);
  if (!issue) throw new Error("Issue not found");
  const repo = pickRepo(issue, input.repoId);
  const settings = getSettings();
  const now = new Date().toISOString();
  const run = insertRun({
    issueId: issue.id,
    issueKey: issue.key,
    issueTitle: issue.title,
    issueSource: issue.source,
    issueUrl: issue.url,
    repoId: repo.id,
    repoSlug: `${repo.owner}/${repo.name}`,
    branch: `agent/${issue.key.replace(/[^A-Za-z0-9._-]+/g, "-")}`,
    worktreePath: "",
    phase: "plan",
    round: 0,
    maxRounds: settings.reviewRounds,
    status: "queued",
    costUsd: 0,
    capUsd: settings.dollarCapUsd,
    prDraft: settings.prDraft,
    createdAt: now,
    updatedAt: now,
  });
  enqueue(run.id);
  return run;
}

export function enqueue(id: number): void {
  queue.push(id);
  publish("runs.updated");
  void pump();
}

export async function pump(): Promise<void> {
  if (pumping) return;
  pumping = true;
  try {
    await drain();
  } finally {
    pumping = false;
  }
}

async function drain(): Promise<void> {
  const settings = getSettings();
  while (queue.length) {
    const running = activeRunCount();
    if (running >= settings.maxConcurrency) break;
    const id = queue.shift();
    if (id == null) break;
    await executeQueued(id);
  }
}

async function executeQueued(id: number): Promise<void> {
  const run = getRun(id);
  if (!run) return;
  const repo = getRepo(run.repoId);
  if (!repo) {
    updateRun(id, { status: "failed", pauseReason: "Repo missing" });
    return;
  }
  const resuming = Boolean(run.startedAt);
  try {
    if (repo.localPath) {
      const wt = await ensureWorktree(
        repo.localPath,
        run.issueKey,
        repo.defaultBranch,
        run.worktreePath || undefined,
      );
      updateRun(id, {
        worktreePath: wt.path,
        status: "running",
        startedAt: run.startedAt ?? new Date().toISOString(),
      });
    } else {
      updateRun(id, { status: "running", startedAt: run.startedAt ?? new Date().toISOString() });
    }
    const live = getRun(id)!;
    if (live.phase === "fix") {
      const result = await runAgentPhase(live, "implementer", await buildFixPrompt(live), "resume");
      if (result.status === "ok") updateRun(id, { status: "paused", pauseReason: "Fix finished" });
      publish("runs.updated");
      return;
    }
    const goal = latestGoal(run.issueId);
    const result = goal ? await orchestrate(live, resuming) : await singleSession(live, resuming);
    if (result === "ok") await openPullRequest(getRun(id)!);
    publish("runs.updated");
    publish("issues.updated");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    updateRun(id, { status: "paused", pauseReason: message });
    await notify("Run paused", message, `/runs/${id}`);
    publish("runs.updated");
  }
}

async function singleSession(run: Run, resuming: boolean): Promise<"ok" | "ask" | "error"> {
  updateRun(run.id, { phase: "implement" });
  const result = await runAgentPhase(
    getRun(run.id)!,
    "implementer",
    promptFor(run),
    resuming ? "resume" : "start",
  );
  return result.status;
}

function promptFor(run: Run): string {
  const goal = latestGoal(run.issueId);
  return [
    `Work issue ${run.issueKey}: ${run.issueTitle}`,
    goal ? `Goal:\n${goal.markdown}` : "Use the issue description as the goal.",
    "Stay inside this git worktree. Follow CLAUDE.md.",
  ].join("\n\n");
}

function pickRepo(issue: Issue, repoId?: number) {
  if (repoId) {
    const r = getRepo(repoId);
    if (!r) throw new Error("Repo not found");
    return r;
  }
  const linked = issue.repos.filter((r) => r.registered);
  if (linked.length !== 1) throw new Error("Pick a single registered repo for this issue");
  const slug = `${linked[0]!.owner}/${linked[0]!.name}`;
  return getRepoBySlug(slug) ?? listRepos()[0]!;
}
