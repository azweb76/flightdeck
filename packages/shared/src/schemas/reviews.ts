import { z } from "zod";

export const ReviewCommentStateSchema = z.enum(["pending", "kept", "edited", "discarded"]);

export const ReviewDraftSchema = z.object({
  id: z.number().int().positive(),
  repoSlug: z.string(),
  prNumber: z.number().int().positive(),
  path: z.string(),
  line: z.number().int().positive(),
  body: z.string(),
  state: ReviewCommentStateSchema,
});
export type ReviewDraft = z.infer<typeof ReviewDraftSchema>;

export const PrFileSchema = z.object({
  path: z.string(),
  patch: z.string(),
  additions: z.number(),
  deletions: z.number(),
});

export const PrReviewSessionSchema = z.object({
  id: z.number().int().positive(),
  repoSlug: z.string(),
  prNumber: z.number().int().positive(),
  title: z.string(),
  files: z.array(PrFileSchema),
  drafts: z.array(ReviewDraftSchema),
  status: z.enum(["drafting", "submitted"]),
});
export type PrReviewSession = z.infer<typeof PrReviewSessionSchema>;
