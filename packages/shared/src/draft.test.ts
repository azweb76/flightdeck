import { describe, expect, it } from "vitest";
import { draftToMarkdown, emptyDraft } from "./draft.ts";

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
