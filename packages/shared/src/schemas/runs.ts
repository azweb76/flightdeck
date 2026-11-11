import { z } from "zod";
import { AgentRoleSchema } from "./roles.ts";

export const RunStatusSchema = z.enum([
  "queued",
  "running",
  "paused",
  "asking",
  "completed",
  "failed",
  "cancelled",
  "interrupted",
]);
export type RunStatus = z.infer<typeof RunStatusSchema>;

export const RunPhaseSchema = z.enum([
  "plan",
  "implement",
  "review",
  "pr",
  "fix",
  "session_review",
]);
export type RunPhase = z.infer<typeof RunPhaseSchema>;

export const TranscriptKindSchema = z.enum([
  "text",
  "tool",
  "tool_result",
  "usage",
  "error",
  "system",
]);

export const TranscriptEventSchema = z.object({
  id: z.number().int().positive(),
  runId: z.number().int().positive(),
  sessionId: z.number().int().positive().optional(),
  role: AgentRoleSchema.optional(),
  kind: TranscriptKindSchema,
  title: z.string(),
  detail: z.string().default(""),
  tool: z.string().optional(),
  path: z.string().optional(),
  tokensIn: z.number().optional(),
  tokensOut: z.number().optional(),
  usd: z.number().optional(),
  at: z.string(),
});
export type TranscriptEvent = z.infer<typeof TranscriptEventSchema>;

export const RunSchema = z.object({
  id: z.number().int().positive(),
  issueId: z.string(),
  issueKey: z.string(),
  issueTitle: z.string(),
  issueSource: z.enum(["jira", "github", "adhoc"]),
  issueUrl: z.string().default(""),
  repoId: z.number().int(),
  repoSlug: z.string(),
  branch: z.string(),
  worktreePath: z.string(),
  phase: RunPhaseSchema,
  round: z.number().int().nonnegative(),
  maxRounds: z.number().int().positive(),
  status: RunStatusSchema,
  costUsd: z.number(),
  capUsd: z.number(),
  prUrl: z.string().optional(),
  prNumber: z.number().optional(),
  prDraft: z.boolean(),
  pauseReason: z.string().optional(),
  questionId: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
});
export type Run = z.infer<typeof RunSchema>;

export const StartRunSchema = z.object({
  issueId: z.string().min(1),
  repoId: z.number().int().positive().optional(),
  repoSlug: z.string().min(3).optional(),
});
export type StartRun = z.infer<typeof StartRunSchema>;
