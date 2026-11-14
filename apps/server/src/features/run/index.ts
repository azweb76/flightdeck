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
import { countActive, findActiveForIssue, getChange, insertChange, saveChange } from "./store.ts";
import { addWorktree, demoWorktree, removeWorktree } from "./worktree.ts";

export { getChange, listChanges } from "./store.ts";

const jobs = new Map<string, Promise<void>>();

export function waitForChange(id: string): Promise<void> {
  return jobs.get(id) ?? Promise.resolve();
}

export async function startChange(issueId: string): Promise<Change> {
  const existing = findActiveForIssue(issueId);
  if (existing) return existing;
  const issue = loadIssue(issueId);
  if (!issue) throw new Error("Issue not found");
  if (!issue.repoSlug) throw new Error("Pick a repo for this issue first");
  const settings = getSettings();
  if (countActive() >= settings.maxConcurrentAgents) {
    throw new Error(`Already running ${settings.maxConcurrentAgents} agents. Wait or raise the limit in Settings.`);
  }
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
  publish("change.updated", { id: change.id, change: getChange(change.id) });
  kick(change.id);
  return getChange(change.id) ?? change;
}

export async function replyChange(id: string, text: string): Promise<Change> {
  const change = getChange(id);
  if (!change) throw new Error("Change not found");
  if (!canReply(change.status)) throw new Error("This run is not waiting for a reply");
  log(change, { kind: "user", title: "dan", detail: text });
  const asking = change.status === "asking";
  change.ask = undefined;
  if (asking) change.status = "implementing";
  saveChange(change);
  if (asking) kick(id, text);
  return getChange(id) ?? change;
}

export async function archiveChange(id: string): Promise<Change> {
  const change = getChange(id);
  if (!change) throw new Error("Change not found");
  if (!canArchive(change.status)) throw new Error("Wait until this run pauses or finishes before archiving");
  const [owner, name] = change.repoSlug.split("/");
  if (owner && name) await removeWorktree(repoPath(owner, name), change.worktreePath);
  change.status = "archived";
  change.worktreePath = "";
  log(change, { kind: "system", title: "archived", detail: "Worktree removed." });
  saveChange(change);
  publish("change.updated", { id: change.id, change: getChange(change.id) });
  return getChange(id) ?? change;
}

function kick(id: string, answer?: string): void {
  const prev = jobs.get(id) ?? Promise.resolve();
  const job = prev.then(() => drive(id, answer));
  jobs.set(id, job);
}

async function drive(id: string, answer?: string): Promise<void> {
  const change = getChange(id);
  if (!change) return;
  try {
    if (process.env.FLIGHTDECK_DEMO === "1") await runDemo(change, answer);
    else await runLive(change, answer);
  } catch (err) {
    change.status = "error";
    log(change, { kind: "system", title: "error", detail: err instanceof Error ? err.message : String(err) });
    saveChange(change);
    publish("change.updated", { id: change.id, change: getChange(change.id) });
  }
}

export type { Change };
