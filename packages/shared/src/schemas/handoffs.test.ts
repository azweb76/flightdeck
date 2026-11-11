import { describe, expect, it } from "vitest";
import { HandoffSchema, handoffToMarkdown } from "./handoffs.ts";

describe("HandoffSchema", () => {
  it("accepts a plan and rejects an empty step list", () => {
    const ok = HandoffSchema.safeParse({
      kind: "plan",
      summary: "Add CSV export",
      steps: ["Write helper", "Add route"],
    });
    expect(ok.success).toBe(true);
    const bad = HandoffSchema.safeParse({ kind: "plan", summary: "x", steps: [] });
    expect(bad.success).toBe(false);
  });

  it("renders review findings to markdown", () => {
    const md = handoffToMarkdown({
      kind: "review",
      passed: false,
      findings: [{ severity: "major", title: "No tests", detail: "Missing 429 case" }],
      notes: "",
    });
    expect(md).toContain("**major**");
    expect(md).toContain("No tests");
  });
});
