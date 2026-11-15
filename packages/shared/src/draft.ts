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

export function markdownToDraft(markdown: string, fallbackTitle = ""): IssueDraft {
  const draft = emptyDraft();
  const text = markdown.replace(/\r\n/g, "\n").trim();
  const titleLine = text.match(/^#\s+(.+)$/m);
  draft.title = fallbackTitle.trim() || titleLine?.[1]?.trim() || "";
  const labels = Object.fromEntries(DRAFT_SECTIONS.map((key) => [DRAFT_SECTION_LABELS[key].toLowerCase(), key])) as Record<
    string,
    DraftSection
  >;
  const chunks = text.split(/^##\s+/m);
  if (chunks.length <= 1) {
    draft.goal = text.replace(/^#\s+.+\n*/, "").trim();
    return draft;
  }
  for (const chunk of chunks.slice(1)) {
    const nl = chunk.indexOf("\n");
    const heading = (nl === -1 ? chunk : chunk.slice(0, nl)).trim().toLowerCase();
    const body = (nl === -1 ? "" : chunk.slice(nl + 1)).trim();
    const key = labels[heading];
    if (key) draft[key] = body;
  }
  return draft;
}

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
