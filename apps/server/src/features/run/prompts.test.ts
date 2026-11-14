import { describe, expect, it } from "vitest";
import { draftToMarkdown, emptyDraft } from "@flightdeck/shared";
import type { Change } from "@flightdeck/shared";
import { implementPrompt, planPrompt, reviewPrompt } from "./prompts.ts";

const body = draftToMarkdown({
  ...emptyDraft(),
  title: "Export invoices as CSV",
  goal: "Finance needs a CSV of paid invoices.",
  acceptance: "- CSV includes only paid invoices.\n- Download starts from the invoices page.",
  files: "src/invoices/export.ts",
  approach: "Add an export route and a button.",
  outOfScope: "PDF export.",
  testPlan: "Unit test the CSV rows.",
});

function stub(over: Partial<Change> = {}): Change {
  return {
    id: "c1",
    issueId: "github:acme/web#12",
    issueKey: "acme/web#12",
    issueSource: "github",
    issueUrl: "",
    repoSlug: "acme/web",
    title: "Export invoices as CSV",
    issueBody: body,
    status: "planning",
    stage: "plan",
    reviewRound: 1,
    worktreePath: "",
    branch: "",
    planText: "1. Add the export route.",
    costUsd: 0,
    events: [],
    createdAt: "",
    updatedAt: "",
    ...over,
  };
}

describe("run prompts", () => {
  it("includes the six shaping sections in plan, implement, and review", () => {
    const change = stub();
    for (const text of [planPrompt(change), implementPrompt(change), reviewPrompt(change)]) {
      expect(text).toContain("Acceptance criteria");
      expect(text).toContain("CSV includes only paid invoices");
      expect(text).toContain("src/invoices/export.ts");
      expect(text).toContain("PDF export");
      expect(text).toContain("Unit test the CSV rows");
    }
  });

  it("passes Dan's answer only on the implement prompt", () => {
    const change = stub();
    expect(implementPrompt(change, "Paid only")).toContain("Dan answered (this implement round only): Paid only");
    expect(implementPrompt(change)).not.toContain("Dan answered");
    expect(reviewPrompt(change)).not.toContain("Paid only");
  });

  it("does not claim round 4 of 3 after Dan answers", () => {
    expect(reviewPrompt(stub({ reviewRound: 4 }))).toContain("review round 4 (follow-up after Dan answered)");
    expect(reviewPrompt(stub({ reviewRound: 4 }))).not.toContain("of 3");
    expect(reviewPrompt(stub({ reviewRound: 3 }))).toContain("review round 3 of 3");
  });
});
