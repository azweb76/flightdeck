import { z } from "zod";
import { ChatMessageSchema } from "./schemas.ts";

export const PrReviewStatusSchema = z.enum([
  "requested",
  "selected",
  "queued",
  "reviewing",
  "drafts",
  "posted",
  "cap_hit",
  "archived",
  "error",
]);
export type PrReviewStatus = z.infer<typeof PrReviewStatusSchema>;

export const ReviewCommentStateSchema = z.enum(["draft", "approved", "discarded", "posted"]);
export type ReviewCommentState = z.infer<typeof ReviewCommentStateSchema>;

export const ReviewCommentSchema = z.object({
  id: z.string(),
  path: z.string(),
  line: z.number().int(),
  side: z.enum(["LEFT", "RIGHT"]).default("RIGHT"),
  body: z.string(),
  state: ReviewCommentStateSchema,
});
export type ReviewComment = z.infer<typeof ReviewCommentSchema>;

export const ReviewVerdictSchema = z.enum(["COMMENT", "APPROVE", "REQUEST_CHANGES"]);
export type ReviewVerdict = z.infer<typeof ReviewVerdictSchema>;

export const PrReviewSchema = z.object({
  id: z.string(),
  repoSlug: z.string(),
  number: z.number().int(),
  title: z.string(),
  url: z.string(),
  author: z.string().default(""),
  headSha: z.string().default(""),
  status: PrReviewStatusSchema,
  selected: z.boolean(),
  summary: z.string().default(""),
  skillPath: z.string().default(""),
  worktreePath: z.string().default(""),
  costUsd: z.number().default(0),
  postedEvent: ReviewVerdictSchema.optional(),
  comments: z.array(ReviewCommentSchema).default([]),
  messages: z.array(ChatMessageSchema).default([]),
  interrupted: z.boolean().optional(),
  updatedAt: z.string(),
  demo: z.boolean().optional(),
});
export type PrReview = z.infer<typeof PrReviewSchema>;

export function occupiesReviewSlot(status: PrReviewStatus): boolean {
  return status === "reviewing";
}
