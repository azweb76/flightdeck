import type { BoardPr, Issue } from "@flightdeck/shared";
import type { GithubClient } from "../github/index.ts";
import { getSettings } from "../settings/index.ts";
import { loadIssue, loadIssues, pruneIssues, upsertIssue } from "../issues/store.ts";
import { defaultExec } from "../exec/index.ts";
import { countsFrom, writePrDiag } from "./diag.ts";
import { nestPrs } from "./nest.ts";
import { prunePlan } from "./prune.ts";
import { prSearchQueries } from "./query.ts";
import { fetchViewerLogin, searchOpenPrs } from "./search.ts";
import { deleteBoardPrs, linkedByPrMap, listBoardPrs, upsertBoardPr } from "./store.ts";

export type PrSyncResult = { ok: boolean; prs: BoardPr[]; errors: string[]; complete: boolean };

export async function syncBoardPrs(
  deps: { github?: GithubClient } = {},
  opts: { projectKeys: string[] },
): Promise<PrSyncResult> {
  const settings = getSettings();
  if (!settings.boardAuthoredPrs && !settings.boardReviewPrs) {
    record({ query: "(board PR toggles off)", authored: 0, reviewRequested: 0, total: 0, mergedClosed: 0 });
    return { ok: true, prs: listBoardPrs(), errors: [], complete: true };
  }
  try {
    const { prs, login, query } = await loadPrs(deps, settings, opts.projectKeys);
    for (const pr of prs) {
      pr.linkedIssueIds = settings.boardLinkedIssues ? pr.linkedIssueIds : [];
      upsertBoardPr(pr);
    }
    const counts = countsFrom(prs);
    record({ viewerLogin: login, query, ...counts });
    console.info(`pr sync ok total=${counts.total} authored=${counts.authored} review=${counts.reviewRequested}`);
    const { applyAutoRules } = await import("../next/auto.ts");
    await applyAutoRules(prs);
    return { ok: true, prs, errors: [], complete: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "PR search failed";
    const shown = `PR sync: ${message}`;
    console.error(shown);
    record({
      query: "is:pr is:open archived:false author:<login>",
      authored: 0,
      reviewRequested: 0,
      total: 0,
      mergedClosed: 0,
      error: shown,
    });
    return { ok: false, prs: listBoardPrs(), errors: [shown], complete: false };
  }
}

async function loadPrs(
  deps: { github?: GithubClient },
  settings: ReturnType<typeof getSettings>,
  projectKeys: string[],
): Promise<{ prs: BoardPr[]; login?: string; query: string }> {
  if (deps.github) {
    const list = deps.github.listOpenPrs;
    if (!list) return { prs: [], query: "github-client-without-prs" };
    return { prs: await list.call(deps.github), query: "injected" };
  }
  const login = await fetchViewerLogin(defaultExec);
  const query = prSearchQueries({
    authored: settings.boardAuthoredPrs,
    review: settings.boardReviewPrs,
    login,
  }).join(" | ");
  const prs = await searchOpenPrs(defaultExec, {
    authored: settings.boardAuthoredPrs,
    review: settings.boardReviewPrs,
    login,
    projectKeys,
  });
  return { prs, login, query };
}

function record(partial: Parameters<typeof writePrDiag>[0]): void {
  writePrDiag({ syncedAt: new Date().toISOString(), ...partial });
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
