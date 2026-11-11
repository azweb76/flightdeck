export type StoredIssue = { id: string; viaPr: boolean; adhoc: boolean };
export type PrunePlan = { dropIssueIds: string[]; dropPrIds: string[] };

/** Never prune from a partial or failed fetch. */
export function prunePlan(opts: {
  storedIssues: StoredIssue[];
  storedPrIds: string[];
  liveAssignedIds: string[];
  livePrIds: string[];
  assignedComplete: boolean;
  prsComplete: boolean;
  linkedByPr: Record<string, string[]>;
}): PrunePlan {
  const dropIssueIds: string[] = [];
  const dropPrIds: string[] = [];
  const assigned = new Set(opts.liveAssignedIds);
  const livePrs = new Set(opts.livePrIds);
  const remainingPrs = opts.prsComplete ? livePrs : new Set(opts.storedPrIds);
  const linkedIssues = new Set<string>();
  for (const [prId, ids] of Object.entries(opts.linkedByPr)) {
    if (remainingPrs.has(prId)) for (const id of ids) linkedIssues.add(id);
  }

  if (opts.prsComplete) {
    for (const id of opts.storedPrIds) {
      if (!livePrs.has(id)) dropPrIds.push(id);
    }
  }

  for (const issue of opts.storedIssues) {
    if (issue.adhoc) continue;
    const prCard = issue.id.startsWith("pr:") ? issue.id.slice(3) : undefined;
    if (prCard) {
      if (opts.prsComplete && !remainingPrs.has(prCard)) dropIssueIds.push(issue.id);
      continue;
    }
    const keepAssigned = !opts.assignedComplete || assigned.has(issue.id);
    const keepVia = linkedIssues.has(issue.id);
    if (issue.viaPr && !assigned.has(issue.id)) {
      if (opts.prsComplete && !keepVia) dropIssueIds.push(issue.id);
      continue;
    }
    if (!keepAssigned && !keepVia) dropIssueIds.push(issue.id);
  }
  return { dropIssueIds, dropPrIds };
}
