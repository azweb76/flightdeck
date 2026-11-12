import { z } from "zod";

export const DRAFT_SECTIONS = [
  "goal",
  "acceptance",
  "files",
  "approach",
  "outOfScope",
  "testPlan",
] as const;

export type DraftSection = (typeof DRAFT_SECTIONS)[number];

export const DRAFT_SECTION_LABELS: Record<DraftSection | "title", string> = {
  title: "Title",
  goal: "Goal and background",
  acceptance: "Acceptance criteria",
  files: "Relevant files and code areas",
  approach: "Suggested implementation approach",
  outOfScope: "Out of scope",
  testPlan: "Test plan",
};

export const IssueDraftSchema = z.object({
  title: z.string().default(""),
  goal: z.string().default(""),
  acceptance: z.string().default(""),
  files: z.string().default(""),
  approach: z.string().default(""),
  outOfScope: z.string().default(""),
  testPlan: z.string().default(""),
});
export type IssueDraft = z.infer<typeof IssueDraftSchema>;

export const emptyDraft = (): IssueDraft => IssueDraftSchema.parse({});

export function draftToMarkdown(draft: IssueDraft): string {
  return [
    `# ${draft.title || "Untitled"}`,
    "",
    "## Goal and background",
    draft.goal,
    "",
    "## Acceptance criteria",
    draft.acceptance,
    "",
    "## Relevant files and code areas",
    draft.files,
    "",
    "## Suggested implementation approach",
    draft.approach,
    "",
    "## Out of scope",
    draft.outOfScope,
    "",
    "## Test plan",
    draft.testPlan,
  ].join("\n");
}
