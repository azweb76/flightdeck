import type { Run } from "@flightdeck/shared";
import { getRepo } from "../repos/index.ts";
import { latestGoal } from "../goals/store.ts";
import { ensureNamedWorktree, ensureWorktree, removeWorktree, withRepoLock } from "../worktree/index.ts";
import { publish } from "../events/index.ts";
import { notify } from "../notify/index.ts";
import { getRun, listEvents, updateRun } from "./store.ts";
import { runAgentPhase } from "./execute.ts";
import { openPullRequest } from "./pr.ts";
import { orchestrate } from "./orchestrate.ts";
import { buildFixPrompt } from "./fix.ts";

export async function executeQueued(id: number): Promise<void> {
  const run = getRun(id);
  if (!run) return;
  const repo = getRepo(run.repoId);
  if (!repo) {
    updateRun(id, { status: "failed", pauseReason: "Repo missing" });
    return;
  }
  const resuming = Boolean(run.startedAt);
  try {
    await attachWorktree(run, repo);
    const live = getRun(id)!;
    if (live.phase === "fix") {
      const result = await runAgentPhase(live, "implementer", await buildFixPrompt(live), "resume");
      if (result.status === "ok") updateRun(id, { status: "paused", pauseReason: "Fix finished" });
      publish("runs.updated");
      return;
    }
    const goal = latestGoal(run.issueId);
    const promptRun = getRun(id)!;
    const result = goal
      ? await orchestrate(promptRun, resuming)
      : await singleSession(promptRun, resuming);
    if (result === "ok") await openPullRequest(getRun(id)!);
    const done = getRun(id);
    if (done?.status === "running") {
      updateRun(id, { status: "completed", finishedAt: new Date().toISOString() });
    }
    await cleanupWorktree(getRun(id)!);
    publish("runs.updated");
    publish("issues.updated");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    updateRun(id, { status: "paused", pauseReason: message });
    await notify("Run paused", message, `/runs/${id}`);
    publish("runs.updated");
  }
}

async function attachWorktree(run: Run, repo: { localPath: string; defaultBranch: string; owner: string; name: string }) {
  if (run.worktreePath || !repo.localPath) {
    updateRun(run.id, {
      branch: run.branch.startsWith("agent/pending") ? `agent/run-${run.id}` : run.branch,
      worktreePath: run.worktreePath,
      status: "running",
      startedAt: run.startedAt ?? new Date().toISOString(),
    });
    return;
  }
  const wt = await withRepoLock(`${repo.owner}/${repo.name}`, async () => {
    const onPrHead = run.phase === "fix" && Boolean(run.prNumber) && !run.branch.startsWith("agent/");
    if (onPrHead) return ensureNamedWorktree(repo.localPath, run.branch, run.worktreePath || undefined);
    return ensureWorktree(repo.localPath, `run-${run.id}`, repo.defaultBranch, run.worktreePath || undefined);
  });
  updateRun(run.id, {
    worktreePath: wt.path,
    branch: wt.branch,
    status: "running",
    startedAt: run.startedAt ?? new Date().toISOString(),
  });
}

async function singleSession(run: Run, resuming: boolean): Promise<"ok" | "ask" | "error"> {
  updateRun(run.id, { phase: "implement" });
  const result = await runAgentPhase(getRun(run.id)!, "implementer", promptFor(run, resuming), resuming ? "resume" : "start");
  return result.status;
}

export function promptFor(run: Run, resuming = false): string {
  const goal = latestGoal(run.issueId);
  const parts = [
    `Work issue ${run.issueKey}: ${run.issueTitle}`,
    goal ? `Goal:\n${goal.markdown}` : "Use the issue description as the goal.",
    "Stay inside this git worktree. Follow CLAUDE.md.",
  ];
  if (resuming) {
    const ctx = listEvents(run.id)
      .slice(-40)
      .map((e) => `${e.kind}: ${e.title} ${e.detail}`.trim())
      .join("\n")
      .slice(0, 8000);
    if (ctx) parts.push(`Prior transcript:\n${ctx}`);
  }
  return parts.join("\n\n");
}

async function cleanupWorktree(run: Run): Promise<void> {
  if (run.status !== "completed" && run.status !== "cancelled") return;
  if (!run.worktreePath) return;
  const repo = getRepo(run.repoId);
  if (!repo?.localPath) return;
  try {
    await withRepoLock(run.repoSlug, () => removeWorktree(repo.localPath, run.worktreePath, run.branch));
  } catch {
    /* leftover worktree is safe to remove later */
  }
}
