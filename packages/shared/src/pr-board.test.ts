import { describe, expect, it } from "vitest";
import type { BoardPr } from "./schemas/issues.ts";
import { classifyPr, prsNeedingMe } from "./pr-board.ts";

function pr(partial: Partial<BoardPr>): BoardPr {
  return {
    id: "acme/web#1",
    number: 1,
    title: "t",
    url: "https://github.com/acme/web/pull/1",
    repo: "acme/web",
    role: "mine",
    ci: "passing",
    review: "pending",
    unresolvedThreads: 0,
    draft: false,
    ageDays: 1,
    headRef: "head",
    headRepo: "acme/web",
    viewerCanPush: true,
    isFork: false,
    body: "",
    createdAt: "2026-11-01T00:00:00Z",
    updatedAt: "2026-11-11T00:00:00Z",
    linkedIssueIds: [],
    state: "open",
    ...partial,
  };
}

describe("classifyPr", () => {
  it("uses first-match order Draft, CI failing, Changes requested, Needs review, Approved", () => {
    expect(classifyPr(pr({ draft: true, ci: "failing", review: "changes_requested" }))).toBe("draft");
    expect(classifyPr(pr({ ci: "failing", review: "approved" }))).toBe("ci_failing");
    expect(classifyPr(pr({ review: "changes_requested" }))).toBe("changes_requested");
    expect(classifyPr(pr({ review: "pending", ci: "passing" }))).toBe("needs_review");
    expect(classifyPr(pr({ review: "pending", ci: "pending" }))).toBe("needs_review");
    expect(classifyPr(pr({ review: "approved" }))).toBe("approved");
    expect(classifyPr(pr({ state: "merged", draft: true }))).toBe("merged_closed");
    expect(classifyPr(pr({ state: "closed" }))).toBe("merged_closed");
  });
});

describe("prsNeedingMe", () => {
  it("counts my failing/changes-requested PRs plus open review requests", () => {
    const prs = [
      pr({ id: "a", role: "mine", ci: "failing" }),
      pr({ id: "b", role: "mine", review: "changes_requested" }),
      pr({ id: "c", role: "mine", ci: "passing", review: "approved" }),
      pr({ id: "d", role: "review", ci: "passing" }),
      pr({ id: "e", role: "review", state: "merged" }),
      pr({ id: "f", role: "mine", ci: "failing", state: "closed" }),
    ];
    expect(prsNeedingMe(prs)).toBe(3);
  });
});
