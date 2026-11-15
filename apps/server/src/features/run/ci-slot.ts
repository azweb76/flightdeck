import type { Change } from "@flightdeck/shared";
import { getPullState } from "../github/prs.ts";
import type { FetchFn } from "../github/octokit.ts";
import { emitChange, log } from "./emit.ts";
import { occupiesSlot } from "./machine.ts";
import { pumpQueue } from "./queue.ts";
import { getChange } from "./store.ts";

export type SlotWaitDeps = {
  token?: string;
  fetchFn?: FetchFn;
  pullState?: typeof getPullState;
  pollMs?: number;
};

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
