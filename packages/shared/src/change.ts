import { z } from "zod";
import { IssueSourceSchema } from "./schemas.ts";

export const MAX_REVIEW_ROUNDS = 3;
export const MAX_CI_ROUNDS = 3;

export function reviewRoundCaption(round: number): string {
  if (round <= 0) return "Waiting";
  if (round > MAX_REVIEW_ROUNDS) return "Follow-up after Dan answered";
  return `Round ${round} of ${MAX_REVIEW_ROUNDS}`;
}

export function extraRoundLabel(round: number): string {
  return round > MAX_REVIEW_ROUNDS ? "Follow-up after Dan answered" : `Round ${round}`;
}

export function ciRoundCaption(round: number, status?: string): string {
  if (status === "needs_dan") return `Stopped after ${MAX_CI_ROUNDS} failed attempts`;
  if (round <= 0) return "Waiting for checks";
  if (round > MAX_CI_ROUNDS) return "Follow-up after Dan answered";
  return `Attempt ${round} of ${MAX_CI_ROUNDS}`;
}

export const ChangeStatusSchema = z.enum([
  "queued",
  "planning",
  "implementing",
  "reviewing",
  "asking",
  "opening_pr",
  "watching_ci",
  "fixing_ci",
  "done",
  "needs_dan",
  "cap_hit",
  "archived",
  "error",
]);
export type ChangeStatus = z.infer<typeof ChangeStatusSchema>;

export const ChangeStageSchema = z.enum(["plan", "implement", "review", "pr", "ci"]);
export type ChangeStage = z.infer<typeof ChangeStageSchema>;

export const ChangeAskSchema = z.object({
  prompt: z.string(),
  options: z.array(z.object({ id: z.string(), label: z.string() })),
});
export type ChangeAsk = z.infer<typeof ChangeAskSchema>;

export const ChangeEventSchema = z.object({
  id: z.string(),
  at: z.string(),
  kind: z.enum(["text", "ask", "tool", "usage", "stage", "system", "user"]),
  title: z.string(),
  detail: z.string().optional(),
  ask: ChangeAskSchema.optional(),
  costUsd: z.number().optional(),
});
export type ChangeEvent = z.infer<typeof ChangeEventSchema>;

export const ChangeSchema = z.object({
  id: z.string(),
  issueId: z.string(),
  issueKey: z.string(),
  issueSource: IssueSourceSchema,
  issueUrl: z.string().default(""),
  repoSlug: z.string(),
  title: z.string(),
  issueBody: z.string().default(""),
  status: ChangeStatusSchema,
  stage: ChangeStageSchema,
  reviewRound: z.number().int().min(0),
  ciRound: z.number().int().min(0).default(0),
  ciPhase: z.enum(["", "watching", "fixing"]).default(""),
  worktreePath: z.string().default(""),
  branch: z.string().default(""),
  planText: z.string().default(""),
  costUsd: z.number().default(0),
  prUrl: z.string().optional(),
  prNumber: z.number().optional(),
  scenario: z.string().optional(),
  ask: ChangeAskSchema.optional(),
  events: z.array(ChangeEventSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
  demo: z.boolean().optional(),
  interrupted: z.boolean().optional(),
});
export type Change = z.infer<typeof ChangeSchema>;
