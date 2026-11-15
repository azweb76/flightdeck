import { describe, expect, it } from "vitest";
import { filterOwnPrs, prNeedsYou, type OwnPr } from "./pr.ts";

function pr(partial: Partial<OwnPr> & Pick<OwnPr, "number" | "ci" | "review" | "draft" | "needsYou">): OwnPr {
  return {
    id: `github:acme/web#${partial.number}`,
    repoSlug: "acme/web",
    title: "t",
    url: "https://github.com/acme/web/pull/1",
    ciRound: 0,
    updatedAt: "2026-11-15T00:00:00.000Z",
    ...partial,
  };
}

describe("My PRs filters", () => {
  const rows = [
    pr({ number: 80, ci: "passing", review: "none", draft: false, needsYou: false }),
    pr({ number: 81, ci: "failing", review: "none", draft: false, needsYou: true }),
    pr({ number: 82, ci: "failing", review: "none", draft: true, needsYou: false, ciRound: 2 }),
    pr({ number: 84, ci: "passing", review: "changes_requested", draft: false, needsYou: true }),
  ];

  it("filters needs-you, failing, draft, and ready", () => {
    expect(filterOwnPrs(rows, "needs_you").map((p) => p.number)).toEqual([81, 84]);
    expect(filterOwnPrs(rows, "failing").map((p) => p.number)).toEqual([81, 82]);
    expect(filterOwnPrs(rows, "draft").map((p) => p.number)).toEqual([82]);
    expect(filterOwnPrs(rows, "ready").map((p) => p.number)).toEqual([80, 81, 84]);
    expect(filterOwnPrs(rows, "all")).toHaveLength(4);
  });

  it("needs-you for changes requested, give-up, and live failing without auto-fix", () => {
    expect(prNeedsYou({ review: "changes_requested", ci: "passing", ciRound: 0 })).toBe(true);
    expect(prNeedsYou({ review: "none", ci: "failing", ciRound: 3 }, "needs_dan")).toBe(true);
    expect(prNeedsYou({ review: "none", ci: "failing", ciRound: 2 }, "fixing_ci")).toBe(false);
    expect(prNeedsYou({ review: "none", ci: "failing", ciRound: 0 })).toBe(true);
    expect(prNeedsYou({ review: "none", ci: "action_required", ciRound: 0 })).toBe(true);
  });
});
