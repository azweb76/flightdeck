import { describe, expect, it } from "vitest";
import { draftToMarkdown, emptyDraft, markdownToDraft } from "./draft.ts";

describe("draftToMarkdown", () => {
  it("includes all six sections", () => {
    const md = draftToMarkdown({ ...emptyDraft(), title: "CSV", goal: "Export" });
    expect(md).toContain("# CSV");
    expect(md).toContain("## Goal and background");
    expect(md).toContain("## Acceptance criteria");
    expect(md).toContain("## Relevant files and code areas");
    expect(md).toContain("## Suggested implementation approach");
    expect(md).toContain("## Out of scope");
    expect(md).toContain("## Test plan");
  });
});

describe("markdownToDraft", () => {
  it("fills sections from saved issue markdown", () => {
    const md = draftToMarkdown({
      ...emptyDraft(),
      title: "Invoice CSV",
      goal: "Finance wants a CSV.",
      acceptance: "- Paid only",
    });
    const draft = markdownToDraft(md);
    expect(draft.title).toBe("Invoice CSV");
    expect(draft.goal).toBe("Finance wants a CSV.");
    expect(draft.acceptance).toBe("- Paid only");
    expect(draft.goal).not.toContain("##");
  });

  it("keeps a plain body in goal when there are no headings", () => {
    const draft = markdownToDraft("Need CSV", "Export");
    expect(draft.title).toBe("Export");
    expect(draft.goal).toBe("Need CSV");
  });
});
