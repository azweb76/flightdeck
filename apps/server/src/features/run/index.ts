import type { Change } from "@flightdeck/shared";
import { repoPath, ensureClone } from "../clone/index.ts";
import { publish } from "../events/index.ts";
import { loadIssue } from "../issues/index.ts";
import { getSettings } from "../settings/index.ts";
import { canArchive, canReply } from "./machine.ts";
import { runDemo } from "./demo-run.ts";
import { log } from "./emit.ts";
import { runLive } from "./live-run.ts";
import { demoScenarioFor } from "./script.ts";
import { assertPreflightGate } from "../preflight/gate.ts";
import { currentRunEpoch, getJob, isRunCurrent, setJob } from "./jobs.ts";
import { countActive, findActiveForIssue, getChange, insertChange, saveChange } from "./store.ts";
import { pumpQueue, setQueueStarter } from "./queue.ts";
import { isInterrupted, presentChange } from "./view.ts";
import { addWorktree, demoWorktree, removeWorktree } from "./worktree.ts";

export { dailySpendUsd, getChange, listChanges } from "./store.ts";
export { bumpRunEpoch, dropJobs } from "./jobs.ts";
export { pumpQueue } from "./queue.ts";
export { isInterrupted, presentChange } from "./view.ts";

setQueueStarter(kick);

export function waitForChange(id: string): Promise<void> {
  return getJob(id) ?? Promise.resolve();
}

export async function startChange(issueId: string): Promise<Change> {
  assertPreflightGate("start");
  const existing = findActiveForIssue(issueId);
  if (existing) return presentChange(existing);
  const busy = countActive();
  const change = await createChange(issueId);
  if (busy >= getSettings().maxConcurrentAgents) {
    change.status = "queued";
    saveChange(change);
    log(change, { kind: "system", title: "queued", detail: "Waiting for a free agent slot." });
    return presentChange(getChange(change.id) ?? change);
  }
  kick(change.id);
  return presentChange(getChange(change.id) ?? change);
}

export async function replyChange(id: string, text: string): Promise<Change> {
  const change = getChange(id);
  if (!change) throw new Error("Change not found");
  if (!canReply(change.status)) throw new Error("This run is not waiting for a reply");
  log(change, { kind: "user", title: "dan", detail: text });
  const asking = change.status === "asking";
  const fromDan = change.status === "needs_dan";
  change.ask = undefined;
  if (fromDan) {
    log(change, {
      kind: "system",
      title: "resume",
      detail: "One more implement and review with your guidance.",
    });
  }
  if (asking || fromDan) change.status = "implementing";
  saveChange(change);
  if (asking || fromDan) kick(id, text);
  return presentChange(getChange(id) ?? change);
}

export async function resumeChange(id: string): Promise<Change> {
  const change = getChange(id);
  if (!change) throw new Error("Change not found");
  if (!isInterrupted(change)) return presentChange(change);
  log(change, { kind: "system", title: "resume", detail: "Resumed after the app restarted." });
  kick(id);
  return presentChange(getChange(id) ?? change);
}

export async function archiveChange(id: string): Promise<Change> {
  const change = getChange(id);
  if (!change) throw new Error("Change not found");
  if (change.status === "archived") return presentChange(change);
  if (!canArchive(change.status, isInterrupted(change))) {
    throw new Error("Wait until this run pauses or finishes before archiving");
  }
  const [owner, name] = change.repoSlug.split("/");
  if (owner && name) await removeWorktree(repoPath(owner, name), change.worktreePath);
  change.status = "archived";
  change.worktreePath = "";
  log(change, { kind: "system", title: "archived", detail: "Worktree removed." });
  publish("change.updated", { id: change.id, change: presentChange(getChange(change.id) ?? change) });
  pumpQueue();
  return presentChange(getChange(id) ?? change);
}

async function createChange(issueId: string): Promise<Change> {
  const issue = loadIssue(issueId);
  if (!issue) throw new Error("Issue not found");
  if (!issue.saved) throw new Error("Save the issue first");
  if (!issue.repoSlug) throw new Error("Pick a repo for this issue first");
  const [owner, name] = issue.repoSlug.split("/");
  if (!owner || !name) throw new Error("Pick a repo as owner/name");
  await ensureClone(owner, name);
  const scenario = process.env.FLIGHTDECK_DEMO === "1" ? demoScenarioFor(issue) : "live";
  const change = insertChange(issue, scenario, "", "");
  const wt = demoWorktree(change.id, `${owner}-${name}`);
  change.worktreePath = wt.path;
  change.branch = wt.branch;
  saveChange(change);
  if (process.env.FLIGHTDECK_DEMO !== "1") {
    await addWorktree(repoPath(owner, name), change.worktreePath, change.branch);
  }
  log(change, { kind: "system", title: "start", detail: `Worktree ${change.branch}` });
  return getChange(change.id) ?? change;
}

function kick(id: string, answer?: string): void {
  const epoch = currentRunEpoch();
  const prev = getJob(id) ?? Promise.resolve();
  const job = prev.then(() => drive(id, answer, epoch));
  setJob(id, job);
}

async function drive(id: string, answer?: string, epoch = currentRunEpoch()): Promise<void> {
  if (!isRunCurrent(epoch)) return;
  const change = getChange(id);
  if (!change) return;
  try {
    if (process.env.FLIGHTDECK_DEMO === "1") await runDemo(change, answer, epoch);
    else await runLive(change, answer);
  } catch (err) {
    if (!isRunCurrent(epoch)) return;
    change.status = "error";
    log(change, { kind: "system", title: "error", detail: err instanceof Error ? err.message : String(err) });
    saveChange(change);
    publish("change.updated", { id: change.id, change: presentChange(getChange(change.id) ?? change) });
  } finally {
    if (isRunCurrent(epoch)) pumpQueue();
  }
}

export type { Change };
