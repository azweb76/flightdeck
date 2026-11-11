import type { BoardPr, Issue } from "@flightdeck/shared";
import type { GithubClient } from "../github/index.ts";
import { getSettings } from "../settings/index.ts";
import { loadIssue, loadIssues, pruneIssues, upsertIssue } from "../issues/store.ts";
import { defaultExec } from "../exec/index.ts";
import { nestPrs } from "./nest.ts";
import { prunePlan } from "./prune.ts";
import { prSearchQuery } from "./query.ts";
import { searchOpenPrs } from "./search.ts";
import { deleteBoardPrs, linkedByPrMap, listBoardPrs, upsertBoardPr } from "./store.ts";

export type PrSyncResult = { ok: boolean; prs: BoardPr[]; errors: string[]; complete: boolean };

export async function syncBoardPrs(
  deps: { github?: GithubClient } = {},
  opts: { incremental?: boolean; projectKeys: string[]; since?: string },
): Promise<PrSyncResult> {
  const settings = getSettings();
  const incremental = Boolean(opts.incremental && opts.since);
  const query = prSearchQuery({
    authored: settings.boardAuthoredPrs,
    review: settings.boardReviewPrs,
    since: incremental ? opts.since : undefined,
  });
  if (!query) return { ok: true, prs: listBoardPrs(), errors: [], complete: true };
  try {
    const fetched = deps.github
      ? deps.github.listOpenPrs
        ? await deps.github.listOpenPrs({ since: incremental ? opts.since : undefined })
        : []
      : await searchOpenPrs(defaultExec, query, opts.projectKeys);
    const prs = fetched;
    for (const pr of prs) {
      pr.linkedIssueIds = settings.boardLinkedIssues ? pr.linkedIssueIds : [];
      upsertBoardPr(pr);
    }
    return { ok: true, prs: incremental ? listBoardPrs() : prs, errors: [], complete: !incremental };
  } catch (err) {
    return {
      ok: false,
      prs: listBoardPrs(),
      errors: [err instanceof Error ? err.message : "PR search failed"],
      complete: false,
    };
  }
}

export function applyBoardPrs(
  assigned: Issue[],
  prs: BoardPr[],
  prsComplete: boolean,
  assignedComplete: boolean,
): Issue[] {
  const settings = getSettings();
  const nested = nestPrs(assigned, prs, settings.boardLinkedIssues);
  for (const issue of nested) {
    upsertIssue(issue, { assigned: true, viaPr: Boolean(issue.viaPr) });
  }
  const stored = loadIssues().map((i) => ({
    id: i.id,
    viaPr: Boolean(loadIssue(i.id)?.viaPr || i.viaPr),
    adhoc: i.source === "adhoc",
  }));
  const plan = prunePlan({
    storedIssues: stored,
    storedPrIds: listBoardPrs().map((p) => p.id),
    liveAssignedIds: assigned.map((i) => i.id),
    livePrIds: prs.map((p) => p.id),
    assignedComplete,
    prsComplete,
    linkedByPr: linkedByPrMap(prsComplete ? prs : listBoardPrs()),
  });
  if (plan.dropPrIds.length) deleteBoardPrs(plan.dropPrIds);
  const keep = stored.map((i) => i.id).filter((id) => !plan.dropIssueIds.includes(id));
  if (plan.dropIssueIds.length) pruneIssues(keep);
  return nestPrs(loadIssues(), listBoardPrs(), settings.boardLinkedIssues);
}
