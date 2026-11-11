import type { BoardPr, PrColumn } from "./schemas/issues.ts";

export const PR_OPEN_COLUMNS: PrColumn[] = [
  "draft",
  "ci_failing",
  "changes_requested",
  "needs_review",
  "approved",
];

export const PR_COLUMN_TITLE: Record<PrColumn, string> = {
  draft: "Draft",
  ci_failing: "CI failing",
  changes_requested: "Changes requested",
  needs_review: "Needs review",
  approved: "Approved",
  merged_closed: "Merged/closed",
};

/** First matching rule: Draft, CI failing, Changes requested, Needs review, Approved. */
export function classifyPr(pr: BoardPr): PrColumn {
  if ((pr.state ?? "open") !== "open") return "merged_closed";
  if (pr.draft) return "draft";
  if (pr.ci === "failing") return "ci_failing";
  if (pr.review === "changes_requested") return "changes_requested";
  if (pr.review === "approved") return "approved";
  return "needs_review";
}

/** My open PRs with failing CI or changes requested, plus open review requests. */
export function prsNeedingMe(prs: readonly BoardPr[]): number {
  return prs.filter((pr) => {
    if ((pr.state ?? "open") !== "open") return false;
    if (pr.role === "review") return true;
    return pr.ci === "failing" || pr.review === "changes_requested";
  }).length;
}
