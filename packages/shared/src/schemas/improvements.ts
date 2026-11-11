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
