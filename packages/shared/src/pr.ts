import { z } from "zod";
import { MAX_CI_ROUNDS } from "./change.ts";

export const PrCiStateSchema = z.enum(["pending", "passing", "failing", "unknown", "action_required"]);
export type PrCiState = z.infer<typeof PrCiStateSchema>;

export const PrReviewStateSchema = z.enum(["none", "approved", "changes_requested", "commented"]);
export type PrReviewState = z.infer<typeof PrReviewStateSchema>;

export const OwnPrSchema = z.object({
  id: z.string(),
  repoSlug: z.string(),
  number: z.number().int(),
  title: z.string(),
  url: z.string(),
  draft: z.boolean(),
  ci: PrCiStateSchema,
  review: PrReviewStateSchema,
  needsYou: z.boolean(),
  ciRound: z.number().int().min(0).default(0),
  changeId: z.string().optional(),
  updatedAt: z.string(),
  demo: z.boolean().optional(),
});
export type OwnPr = z.infer<typeof OwnPrSchema>;

export const PrFilterSchema = z.enum(["all", "needs_you", "failing", "draft", "ready"]);
export type PrFilter = z.infer<typeof PrFilterSchema>;

export function filterOwnPrs(prs: OwnPr[], filter: PrFilter): OwnPr[] {
  if (filter === "needs_you") return prs.filter((p) => p.needsYou);
  if (filter === "failing") return prs.filter((p) => p.ci === "failing");
  if (filter === "draft") return prs.filter((p) => p.draft);
  if (filter === "ready") return prs.filter((p) => !p.draft);
  return prs;
}

export function prNeedsYou(pr: Pick<OwnPr, "review" | "ci" | "ciRound">, changeStatus?: string): boolean {
  if (pr.review === "changes_requested") return true;
  if (pr.ci === "action_required") return true;
  if (changeStatus === "asking" || changeStatus === "needs_dan") return true;
  if (pr.ci !== "failing") return false;
  if (changeStatus === "watching_ci" || changeStatus === "fixing_ci") return pr.ciRound >= MAX_CI_ROUNDS;
  return true;
}
