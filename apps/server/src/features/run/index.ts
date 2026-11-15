import type { Change } from "@flightdeck/shared";
import { demoRepoPath, repoPath, ensureClone } from "../clone/index.ts";
import { publish } from "../events/index.ts";
import { loadIssue } from "../issues/index.ts";
import { canArchive, canReply, isAgentRunning } from "./machine.ts";
import { runDemo } from "./demo-run.ts";
import { log } from "./emit.ts";
import { runLive } from "./live-run.ts";
import { demoScenarioFor } from "./script.ts";
import { assertPreflightGate } from "../preflight/gate.ts";
import { currentRunEpoch, getJob, isHeld, isRunCurrent, setJob } from "./jobs.ts";
import { getChange, saveChange } from "./store.ts";
import { insertAndClaim } from "./claim.ts";
import { pumpQueue, setQueueStarter } from "./queue.ts";
import { isInterrupted, presentChange } from "./view.ts";
import { addWorktree, pruneAllClones, removeWorktree } from "./worktree.ts";
import { abortCiWatch } from "./ci.ts";
import { setParkedCiDeps, startParkedCiWatch } from "./ci-slot.ts";
import { resolveGithubToken } from "../github/token.ts";

export { dailySpendUsd, getChange, listChanges } from "./store.ts";
export { bumpRunEpoch, dropJobs } from "./jobs.ts";
export { pumpQueue } from "./queue.ts";
export { isInterrupted, presentChange } from "./view.ts";

setQueueStarter(kick);

export function waitForChange(id: string): Promise<void> {
  return getJob(id) ?? Promise.resolve();
}

export async function startRunQueue(): Promise<void> {
  await pruneAllClones();
  if (process.env.FLIGHTDECK_DEMO !== "1") {
    const tok = await resolveGithubToken();
    if (tok?.token) setParkedCiDeps({ token: tok.token });
    startParkedCiWatch();
  }
  pumpQueue();
}

export async function startChange(issueId: string): Promise<Change> {
  assertPreflightGate("start");
  const issue = loadIssue(issueId);
  if (!issue) throw new Error("Issue not found");
  if (!issue.saved) throw new Error("Save the issue first");
  if (!issue.repoSlug) throw new Error("Pick a repo for this issue first");
  const scenario = process.env.FLIGHTDECK_DEMO === "1" ? demoScenarioFor(issue) : "live";
  const result = insertAndClaim(issue, scenario);
  if ("existing" in result) return presentChange(result.existing);
  const change = result.change;
  if (!result.claimed) {
    log(change, { kind: "system", title: "queued", detail: "Waiting for a free agent slot." });
    return presentChange(getChange(change.id) ?? change);
  }
  kick(change.id);
  return presentChange(getChange(change.id) ?? change);
}

export async function replyChange(id: string, text: string, optionId?: string): Promise<Change> {
  const change = getChange(id);
  if (!change) throw new Error("Change not found");
  if (!canReply(change.status)) throw new Error("This run is not waiting for a reply");
  log(change, { kind: "user", title: "dan", detail: text });
  const asking = change.status === "asking";
  const fromDan = change.status === "needs_dan";
  change.ask = undefined;
  if (fromDan && change.stage === "ci") {
    if (optionId === "leave") {
      change.status = "done";
      log(change, { kind: "system", title: "resume", detail: "Left the failing checks for you." });
      saveChange(change);
      pumpQueue();
      return presentChange(getChange(id) ?? change);
    }
    log(change, { kind: "system", title: "resume", detail: "One more CI fix with your guidance." });
    change.status = "watching_ci";
    saveChange(change);
    kick(id, text);
    return presentChange(getChange(id) ?? change);
  }
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
  if (!canArchive(change.status, isInterrupted(change) || isHeld(change.id))) {
    throw new Error("Wait until this run pauses or finishes before archiving");
  }
  change.status = "archived";
  change.ciPhase = "";
  saveChange(change);
  abortCiWatch(id);
  try {
    await stripWorktree(change);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    log(change, { kind: "system", title: "archive failed", detail });
    throw new Error(detail);
  }
  change.worktreePath = "";
  log(change, { kind: "system", title: "archived", detail: "Worktree removed." });
  publish("change.updated", { id: change.id, change: presentChange(getChange(change.id) ?? change) });
  pumpQueue();
  return presentChange(getChange(id) ?? change);
}

function kick(id: string, answer?: string): void {
  const epoch = currentRunEpoch();
  const prev = getJob(id) ?? Promise.resolve();
  const job = prev.then(() => drive(id, answer, epoch));
  setJob(id, job);
}

async function drive(id: string, answer?: string, epoch = currentRunEpoch()): Promise<void> {
  if (!isRunCurrent(epoch)) return;
  try {
    await prepareWorktree(id, epoch);
    const change = getChange(id);
    if (!change || !isRunCurrent(epoch)) return;
    if (change.status === "archived" || change.status === "queued") return;
    if (!isAgentRunning(change.status)) return;
    if (process.env.FLIGHTDECK_DEMO === "1") await runDemo(change, answer, epoch);
    else await runLive(change, answer);
  } catch (err) {
    if (!isRunCurrent(epoch)) return;
    const fresh = getChange(id);
    if (!fresh || fresh.status === "archived") return;
    fresh.status = "error";
    log(fresh, { kind: "system", title: "error", detail: err instanceof Error ? err.message : String(err) });
    saveChange(fresh);
    publish("change.updated", { id: fresh.id, change: presentChange(getChange(fresh.id) ?? fresh) });
  } finally {
    if (isRunCurrent(epoch)) pumpQueue();
  }
}

async function prepareWorktree(id: string, epoch = currentRunEpoch()): Promise<void> {
  if (!isRunCurrent(epoch)) return;
  const change = getChange(id);
  if (!change || change.status === "archived" || change.status === "queued") return;
  const [owner, name] = change.repoSlug.split("/");
  if (!owner || !name) return;
  if (process.env.FLIGHTDECK_FAIL_WORKTREE === "1") {
    process.env.FLIGHTDECK_FAIL_WORKTREE = "0";
    throw new Error("clone or worktree failed after the slot was claimed");
  }
  await ensureClone(owner, name);
  if (!isRunCurrent(epoch)) return;
  const fresh = getChange(id);
  if (!fresh || fresh.status === "archived" || fresh.status === "queued") return;
  const dest = fresh.worktreePath;
  if (process.env.FLIGHTDECK_DEMO !== "1" && dest) {
    await addWorktree(repoPath(owner, name), dest, fresh.branch);
  }
  if (!fresh.events.some((e) => e.title === "start")) {
    log(fresh, { kind: "system", title: "start", detail: `Worktree ${fresh.branch}` });
  }
}

async function stripWorktree(change: Change): Promise<void> {
  const [owner, name] = change.repoSlug.split("/");
  if (!owner || !name) return;
  const root = process.env.FLIGHTDECK_DEMO === "1" ? demoRepoPath(owner, name) : repoPath(owner, name);
  await removeWorktree(root, change.worktreePath, change.branch);
}

export type { Change };
