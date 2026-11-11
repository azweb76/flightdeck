import { describe, expect, it } from "vitest";
import type { BoardPr, Issue } from "@flightdeck/shared";
import { nestPrs, prAsIssue } from "./nest.ts";
import { prunePlan } from "./prune.ts";
import { linkIds } from "./parse.ts";

function pr(partial: Partial<BoardPr> & Pick<BoardPr, "id" | "linkedIssueIds">): BoardPr {
  return {
    number: 1,
    title: "PR",
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
    ...partial,
  };
}

function issue(id: string, title = "Issue"): Issue {
  return {
    id,
    source: id.startsWith("jira:") ? "jira" : "github",
    key: id.replace(/^jira:|^github:/, ""),
    title,
    body: "",
    url: "",
    stage: "new",
    repos: [{ owner: "acme", name: "web", registered: true }],
    repoWarning: "none",
    updatedAt: "2026-11-11T00:00:00Z",
  };
}

describe("nestPrs", () => {
  it("nests multiple PRs on one assigned issue and does not duplicate", () => {
    const assigned = [issue("jira:PROJ-150", "Export")];
    const a = pr({ id: "acme/web#431", linkedIssueIds: ["jira:PROJ-150"] });
    const b = pr({ id: "acme/web#432", linkedIssueIds: ["jira:PROJ-150"] });
    const once = nestPrs(assigned, [a, b], true);
    const twice = nestPrs(once, [a, b], true);
    expect(twice).toHaveLength(1);
    expect(twice[0]?.id).toBe("jira:PROJ-150");
    expect(twice[0]?.prs?.map((p) => p.id)).toEqual(["acme/web#431", "acme/web#432"]);
    expect(twice[0]?.viaPr).toBe(true);
  });

  it("adds a via-PR GitHub issue from closing references", () => {
    const board = nestPrs([], [pr({ id: "acme/docs#91", linkedIssueIds: ["github:acme/docs#88"] })], true);
    expect(board).toHaveLength(1);
    expect(board[0]?.id).toBe("github:acme/docs#88");
    expect(board[0]?.viaPr).toBe(true);
    expect(board[0]?.prs?.[0]?.id).toBe("acme/docs#91");
  });

  it("keeps a PR with no links as its own card", () => {
    const p = pr({ id: "acme/api#88", number: 88, repo: "acme/api", linkedIssueIds: [] });
    const board = nestPrs([issue("jira:PROJ-9")], [p], true);
    expect(board.map((i) => i.id).sort()).toEqual(["jira:PROJ-9", "pr:acme/api#88"]);
    expect(prAsIssue(p).key).toBe("acme/api#88");
  });
});

describe("parseSearchPayload", () => {
  it("maps rollup, reviewDecision, and closing issues from GraphQL", async () => {
    const { parseSearchPayload } = await import("./parse.ts");
    const raw = JSON.stringify({
      data: {
        viewer: { login: "dan" },
        search: {
          nodes: [
            {
              number: 3,
              title: "PROJ-1 from dan",
              body: "",
              url: "https://github.com/acme/web/pull/3",
              createdAt: "2026-11-10T00:00:00Z",
              updatedAt: "2026-11-11T00:00:00Z",
              isDraft: false,
              headRefName: "feat",
              author: { login: "dan" },
              repository: { nameWithOwner: "acme/web" },
              headRepository: { nameWithOwner: "acme/web", isFork: false, viewerPermission: "WRITE" },
              reviewDecision: "CHANGES_REQUESTED",
              reviewThreads: { nodes: [{ isResolved: false }, { isResolved: true }] },
              closingIssuesReferences: { nodes: [{ number: 8, repository: { nameWithOwner: "acme/web" } }] },
              commits: { nodes: [{ commit: { statusCheckRollup: { state: "FAILURE" } } }] },
            },
          ],
        },
      },
    });
    const [pr] = parseSearchPayload(raw, "dan", ["PROJ"]);
    expect(pr).toMatchObject({
      role: "mine",
      ci: "failing",
      review: "changes_requested",
      unresolvedThreads: 1,
      viewerCanPush: true,
      linkedIssueIds: ["github:acme/web#8", "jira:PROJ-1"],
    });
  });
});

describe("linkIds", () => {
  it("joins closing issues and Jira keys from title/branch/body", () => {
    expect(
      linkIds([{ repo: "acme/docs", number: 88 }], "PROJ-150 export", "agent/PROJ-150", "See WEB-2", ["PROJ", "WEB"]),
    ).toEqual(["github:acme/docs#88", "jira:PROJ-150", "jira:WEB-2"]);
  });
});

describe("prunePlan", () => {
  it("drops merged PRs and via-PR-only issues when the fetch is complete", () => {
    const plan = prunePlan({
      storedIssues: [
        { id: "jira:PROJ-9", viaPr: false, adhoc: false },
        { id: "github:acme/docs#88", viaPr: true, adhoc: false },
      ],
      storedPrIds: ["acme/docs#91", "acme/web#1"],
      liveAssignedIds: ["jira:PROJ-9"],
      livePrIds: [],
      assignedComplete: true,
      prsComplete: true,
      linkedByPr: { "acme/docs#91": ["github:acme/docs#88"] },
    });
    expect(plan.dropPrIds.sort()).toEqual(["acme/docs#91", "acme/web#1"]);
    expect(plan.dropIssueIds).toEqual(["github:acme/docs#88"]);
  });

  it("does not prune PRs or via-PR issues on a failed fetch", () => {
    const plan = prunePlan({
      storedIssues: [{ id: "github:acme/docs#88", viaPr: true, adhoc: false }],
      storedPrIds: ["acme/docs#91"],
      liveAssignedIds: [],
      livePrIds: [],
      assignedComplete: true,
      prsComplete: false,
      linkedByPr: { "acme/docs#91": ["github:acme/docs#88"] },
    });
    expect(plan.dropPrIds).toEqual([]);
    expect(plan.dropIssueIds).toEqual([]);
  });
});
