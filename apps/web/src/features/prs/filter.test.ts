import { describe, expect, it } from "vitest";
import type { BoardPr } from "@flightdeck/shared";
import { filterPrs } from "./filter.ts";

function pr(partial: Partial<BoardPr>): BoardPr {
  return {
    id: "acme/web#1",
    number: 1,
    title: "t",
    url: "",
    repo: "acme/web",
    role: "mine",
    ci: "passing",
    review: "pending",
    unresolvedThreads: 0,
    draft: false,
    ageDays: 1,
    headRef: "h",
    headRepo: "acme/web",
    viewerCanPush: true,
    isFork: false,
    body: "",
    createdAt: "",
    updatedAt: "",
    linkedIssueIds: [],
    state: "open",
    ...partial,
  };
}

describe("filterPrs", () => {
  it("keeps Mine vs Review and repo/CI/draft", () => {
    const prs = [
      pr({ id: "a", role: "mine", ci: "failing" }),
      pr({ id: "b", role: "review", repo: "acme/api" }),
      pr({ id: "c", role: "mine", draft: true, ci: "passing" }),
    ];
    expect(filterPrs(prs, "mine", {}).map((p) => p.id)).toEqual(["a", "c"]);
    expect(filterPrs(prs, "review", { repo: "acme/api" }).map((p) => p.id)).toEqual(["b"]);
    expect(filterPrs(prs, "mine", { ci: "failing" }).map((p) => p.id)).toEqual(["a"]);
    expect(filterPrs(prs, "mine", { draft: "yes" }).map((p) => p.id)).toEqual(["c"]);
  });
});
