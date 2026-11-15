import type { Change } from "@flightdeck/shared";
import { getPullState } from "../github/prs.ts";
import type { FetchFn } from "../github/octokit.ts";
import { emitChange, log } from "./emit.ts";
import { occupiesSlot } from "./machine.ts";
import { pumpQueue } from "./queue.ts";
import { getChange, listChanges } from "./store.ts";

export type SlotWaitDeps = {
  token?: string;
  fetchFn?: FetchFn;
  pullState?: typeof getPullState;
  pollMs?: number;
};

let parkedDeps: SlotWaitDeps = {};
let parkedLoop = false;
let parkedTimer: ReturnType<typeof setTimeout> | undefined;

export function setParkedCiDeps(deps: SlotWaitDeps): void {
  parkedDeps = { ...parkedDeps, ...deps };
}

export function stopParkedCiWatch(): void {
  parkedLoop = false;
  if (parkedTimer) clearTimeout(parkedTimer);
  parkedTimer = undefined;
  parkedDeps = {};
}

export function startParkedCiWatch(): void {
  if (parkedLoop) return;
  parkedLoop = true;
  void tickParked();
}

export async function pollParkedFixes(): Promise<void> {
  for (const change of listChanges()) {
    if (change.ciPhase !== "queued") continue;
    if (change.status === "archived" || change.status === "done") continue;
    try {
      await prEnded(change, parkedDeps);
    } catch {
      /* keep polling other parked fixes */
    }
  }
}

export async function waitForFixSlot(change: Change, deps: SlotWaitDeps = {}): Promise<boolean> {
  const current = getChange(change.id);
  if (!current || current.status === "archived") return false;
  if (current.status === "fixing_ci" && occupiesSlot(current.status)) {
    Object.assign(change, current);
    if (await prEnded(change, deps)) return false;
    return true;
  }
  park(change);
  pumpQueue();
  const prEvery = deps.pollMs ?? (process.env.FLIGHTDECK_RUN_FAST === "1" ? 5 : 15_000);
  let lastPr = 0;
  for (;;) {
    const row = getChange(change.id);
    if (!row || row.status === "archived") return false;
    Object.assign(change, row);
    const now = Date.now();
    if (lastPr === 0 || now - lastPr >= prEvery) {
      if (await prEnded(change, deps)) return false;
      lastPr = now;
    }
    if (row.status === "fixing_ci") {
      if (await prEnded(change, deps)) return false;
      return true;
    }
    await new Promise((r) => setTimeout(r, process.env.FLIGHTDECK_RUN_FAST === "1" ? 5 : 250));
  }
}

async function tickParked(): Promise<void> {
  while (parkedLoop) {
    await pollParkedFixes();
    if (!parkedLoop) return;
    const wait = parkedDeps.pollMs ?? (process.env.FLIGHTDECK_RUN_FAST === "1" ? 5 : 15_000);
    await new Promise<void>((resolve) => {
      parkedTimer = setTimeout(resolve, wait);
    });
  }
}

async function prEnded(change: Change, deps: SlotWaitDeps): Promise<boolean> {
  if (!deps.token || !change.prNumber) return false;
  const [owner, name] = change.repoSlug.split("/");
  if (!owner || !name) return false;
  const pullState = deps.pullState ?? getPullState;
  const pr = await pullState(deps.token, deps.fetchFn ?? fetch, owner, name, change.prNumber);
  if (!pr.merged && pr.state !== "closed") return false;
  const summary = pr.merged ? "Pull request merged." : "Pull request closed.";
  change.ciPhase = "";
  change.status = "done";
  log(change, { kind: "system", title: "ci", detail: summary });
  emitChange(change);
  return true;
}

function park(change: Change): void {
  if (change.ciPhase === "queued") return;
  change.status = "watching_ci";
  change.ciPhase = "queued";
  log(change, { kind: "system", title: "queued", detail: "Waiting for a free slot" });
  emitChange(change);
}
