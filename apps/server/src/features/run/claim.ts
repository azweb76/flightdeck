import type { Change, Issue } from "@flightdeck/shared";
import { demoRepoPath, repoPath } from "../clone/index.ts";
import { withTransaction } from "../db/index.ts";
import { getSettings } from "../settings/index.ts";
import type { ChangeStatus } from "@flightdeck/shared";
import { countActive, findActiveForIssue, getChange, insertChange, nextQueued, saveChange } from "./store.ts";
import { occupiesSlot } from "./machine.ts";
import { nestedWorktree } from "./worktree.ts";

export type StartClaim = { existing: Change } | { change: Change; claimed: boolean };

/** Insert as queued, then claim a slot in the same transaction. */
export function insertAndClaim(issue: Issue, scenario: string): StartClaim {
  return withTransaction(() => {
    const existing = findActiveForIssue(issue.id);
    if (existing) return { existing };
    const change = insertChange(issue, scenario, "", "", "queued");
    attachPlannedWorktree(change, issue.repoSlug);
    const claimed = tryClaim(change.id);
    return { change: getChange(change.id) ?? change, claimed };
  });
}

export function claimNextQueued(): Change | undefined {
  return withTransaction(() => {
    if (countActive() >= getSettings().maxConcurrentAgents) return undefined;
    const next = nextQueued();
    if (!next) return undefined;
    if (!tryClaim(next.id)) return undefined;
    return getChange(next.id);
  });
}

function attachPlannedWorktree(change: Change, repoSlug: string | undefined): void {
  const [owner, name] = (repoSlug ?? "").split("/");
  if (!owner || !name) return;
  const root = process.env.FLIGHTDECK_DEMO === "1" ? demoRepoPath(owner, name) : repoPath(owner, name);
  const wt = nestedWorktree(root, change.id);
  change.worktreePath = wt.path;
  change.branch = wt.branch;
  saveChange(change);
}

/** Occupy a slot for an already-started change (CI auto-fix). */
export function claimAgentSlot(id: string, next: ChangeStatus): boolean {
  return withTransaction(() => {
    if (countActive() >= getSettings().maxConcurrentAgents) return false;
    const row = getChange(id);
    if (!row || row.status === "archived") return false;
    if (occupiesSlot(row.status)) return true;
    row.status = next;
    saveChange(row);
    return getChange(id)?.status === next;
  });
}

function tryClaim(id: string): boolean {
  if (countActive() >= getSettings().maxConcurrentAgents) return false;
  const row = getChange(id);
  if (!row || row.status !== "queued") return false;
  row.status = "planning";
  saveChange(row);
  return getChange(id)?.status === "planning";
}
