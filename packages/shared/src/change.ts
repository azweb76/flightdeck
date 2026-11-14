import { z } from "zod";
import { IssueSourceSchema } from "./schemas.ts";

export const MAX_REVIEW_ROUNDS = 3;

export const ChangeStatusSchema = z.enum([
  "planning",
  "implementing",
  "reviewing",
  "asking",
  "opening_pr",
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
});
export type Change = z.infer<typeof ChangeSchema>;

export function githubCardTitle(status: {
  loggedIn: boolean;
  user?: string;
  detail: string;
}): string {
  if (status.loggedIn) return status.user ?? "Connected";
  if (/missing scopes/i.test(status.detail) || status.user) {
    return `${status.user ?? "Connected"} · missing scopes`;
  }
  return "Not connected";
}
