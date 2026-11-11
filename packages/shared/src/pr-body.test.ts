import { describe, expect, it } from "vitest";
import { defaultCommitMessage, formatPrBody } from "./pr-body.ts";

describe("formatPrBody", () => {
  it("includes the required sections", () => {
    const body = formatPrBody({
      why: "Finance needs CSV.",
      summary: "Add an export endpoint.",
      changes: ["GET /export", "CSV helper"],
      tested: "unit tests",
      remaining: "load test",
      issues: ["PROJ-150"],
    });
    expect(body).toContain("## Why the change");
    expect(body).toContain("## High-level summary");
    expect(body).toContain("## Main changes");
    expect(body).toContain("- GET /export");
    expect(body).toContain("## How it was tested");
    expect(body).toContain("## Testing still remaining");
    expect(body).toContain("## Linked issues");
    expect(body).toContain("PROJ-150");
  });
});

describe("defaultCommitMessage", () => {
  it("uses the repo convention prefix", () => {
    expect(defaultCommitMessage("PROJ-1", "Export CSV", "feat")).toBe("feat: PROJ-1 Export CSV");
  });
});
