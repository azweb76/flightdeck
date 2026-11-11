import { describe, expect, it } from "vitest";
import { dockBadgeCount, nextNeedsYouCount, priorityRank, sortNextItems, type NextItem } from "./next-queue.ts";

function item(partial: Partial<NextItem>): NextItem {
  return {
    id: "x",
    bucket: "issues",
    key: "K",
    title: "t",
    source: "jira",
    action: "start",
    priority: 4,
    ageMs: 1,
    statusChips: [],
    ...partial,
  };
}

describe("priorityRank", () => {
  it("orders P0/Highest ahead of P2 and unlabeled", () => {
    expect(priorityRank({ jiraPriority: "Highest" })).toBe(0);
    expect(priorityRank({ labels: ["priority:high"] })).toBe(1);
    expect(priorityRank({ labels: ["P2"] })).toBe(2);
    expect(priorityRank({})).toBe(4);
  });
});

describe("sortNextItems", () => {
  it("uses bucket then priority then age", () => {
    const rows = sortNextItems([
      item({ id: "old-issue", bucket: "issues", priority: 0, ageMs: 9 }),
      item({ id: "wait", bucket: "waiting", priority: 4, ageMs: 1 }),
      item({ id: "fix-low", bucket: "fix_prs", priority: 3, ageMs: 2 }),
      item({ id: "fix-high", bucket: "fix_prs", priority: 0, ageMs: 1 }),
    ]);
    expect(rows.map((r) => r.id)).toEqual(["wait", "fix-high", "fix-low", "old-issue"]);
  });
});

describe("nextNeedsYouCount", () => {
  it("ignores the assigned-issues bucket", () => {
    expect(
      nextNeedsYouCount([
        item({ bucket: "waiting" }),
        item({ bucket: "review" }),
        item({ bucket: "issues" }),
      ]),
    ).toBe(2);
  });
});

describe("dockBadgeCount", () => {
  it("sets a count only on macOS", () => {
    expect(dockBadgeCount(3, "darwin")).toBe(3);
    expect(dockBadgeCount(3, "linux")).toBeUndefined();
  });
});
