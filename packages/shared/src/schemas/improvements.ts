import { z } from "zod";

export const ImprovementKindSchema = z.enum([
  "prompt_edit",
  "claude_md_note",
  "setting_change",
]);

export const ImprovementSchema = z.object({
  id: z.number().int().positive(),
  runId: z.number().int().positive().optional(),
  repoSlug: z.string().optional(),
  kind: ImprovementKindSchema,
  title: z.string(),
  detail: z.string(),
  patch: z.string().default(""),
  evalPassed: z.boolean().optional(),
  status: z.enum(["proposed", "approved", "rejected", "queued", "applied"]),
  createdAt: z.string(),
});
export type Improvement = z.infer<typeof ImprovementSchema>;

export const SessionScoreSchema = z.object({
  waste: z.number().min(0).max(10),
  backtracking: z.number().min(0).max(10),
  prQuality: z.number().min(0).max(10),
  stuck: z.number().min(0).max(10),
  missingContext: z.number().min(0).max(10),
  notes: z.string(),
});
export type SessionScore = z.infer<typeof SessionScoreSchema>;

export const SessionFindingSchema = z.object({
  title: z.string(),
  detail: z.string(),
  excerpt: z.string().optional(),
});
export type SessionFinding = z.infer<typeof SessionFindingSchema>;

export const ProposedImprovementSchema = z.object({
  kind: ImprovementKindSchema,
  title: z.string(),
  detail: z.string(),
  patch: z.string().default(""),
});
export type ProposedImprovement = z.infer<typeof ProposedImprovementSchema>;

export const SessionReviewResultSchema = SessionScoreSchema.extend({
  kind: z.literal("session_review").optional(),
  findings: z.array(SessionFindingSchema).default([]),
  improvements: z.array(ProposedImprovementSchema).default([]),
});
export type SessionReviewResult = z.infer<typeof SessionReviewResultSchema>;
