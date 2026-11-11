import { z } from "zod";

export const FindingSeveritySchema = z.enum(["minor", "major"]);

export const ReviewFindingSchema = z.object({
  severity: FindingSeveritySchema,
  title: z.string(),
  detail: z.string(),
  path: z.string().optional(),
});
export type ReviewFinding = z.infer<typeof ReviewFindingSchema>;

export const PlanHandoffSchema = z.object({
  kind: z.literal("plan"),
  summary: z.string(),
  steps: z.array(z.string()).min(1),
  files: z.array(z.string()).default([]),
});

export const ImplementHandoffSchema = z.object({
  kind: z.literal("implement"),
  summary: z.string(),
  filesChanged: z.array(z.string()).default([]),
  testsRun: z.array(z.string()).default([]),
  remaining: z.string().default(""),
});

export const ReviewHandoffSchema = z.object({
  kind: z.literal("review"),
  passed: z.boolean(),
  findings: z.array(ReviewFindingSchema),
  notes: z.string().default(""),
});
export type PlanHandoff = z.infer<typeof PlanHandoffSchema>;
export type ImplementHandoff = z.infer<typeof ImplementHandoffSchema>;
export type ReviewHandoff = z.infer<typeof ReviewHandoffSchema>;

export const HandoffSchema = z.discriminatedUnion("kind", [
  PlanHandoffSchema,
  ImplementHandoffSchema,
  ReviewHandoffSchema,
]);
export type Handoff = z.infer<typeof HandoffSchema>;

export function handoffToMarkdown(h: Handoff): string {
  if (h.kind === "plan") {
    return ["# Plan", h.summary, "", ...h.steps.map((s, i) => `${i + 1}. ${s}`)].join("\n");
  }
  if (h.kind === "implement") {
    return [
      "# Implement",
      h.summary,
      "",
      "## Files",
      ...h.filesChanged.map((f) => `- ${f}`),
      "",
      "## Tests",
      ...h.testsRun.map((t) => `- ${t}`),
    ].join("\n");
  }
  return [
    "# Review",
    h.passed ? "Passed." : "Findings remain.",
    "",
    ...h.findings.map((f) => `- **${f.severity}**: ${f.title} — ${f.detail}`),
  ].join("\n");
}
