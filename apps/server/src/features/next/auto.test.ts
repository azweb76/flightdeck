import { describe, expect, it, beforeEach } from "vitest";
import type { BoardPr, Settings } from "@flightdeck/shared";
import { applyAutoRules, resetAutoSeen } from "./auto.ts";

function pr(partial: Partial<BoardPr>): BoardPr {
  return {
    id: "acme/web#1",
    number: 1,
    title: "t",
    url: "",
    repo: "acme/web",
    role: "mine",
    ci: "failing",
    review: "pending",
    unresolvedThreads: 0,
    draft: false,
    ageDays: 1,
    headRef: "h",
    headRepo: "acme/web",
    viewerCanPush: true,
    isFork: false,
    body: "",
    createdAt: "2026-11-01T00:00:00Z",
    updatedAt: "2026-11-11T00:00:00Z",
    linkedIssueIds: [],
    state: "open",
    labels: [],
    ...partial,
  };
}

const off = { autoFixCi: false, autoDraftReviews: false } as Settings;

describe("applyAutoRules", () => {
  beforeEach(() => resetAutoSeen());

  it("does nothing when both rules are off", async () => {
    const started = await applyAutoRules([pr({})], {
      settings: off,
      spend: { blocked: false, todayUsd: 0, capUsd: 50 },
      fix: async () => {
        throw new Error("should not fix");
      },
      review: async () => {
        throw new Error("should not review");
      },
    });
    expect(started).toEqual([]);
  });

  it("starts a fix and a draft review when opted in and spend allows", async () => {
    const started = await applyAutoRules([pr({ id: "a#1" }), pr({ id: "b#2", role: "review", ci: "passing", number: 2, repo: "acme/api" })], {
      settings: { ...off, autoFixCi: true, autoDraftReviews: true },
      spend: { blocked: false, todayUsd: 0, capUsd: 50 },
      fix: async () => undefined,
      review: async () => undefined,
    });
    expect(started).toEqual(["fix:a#1", "review:b#2"]);
  });

  it("skips auto starts when the daily cap is hit", async () => {
    const started = await applyAutoRules([pr({})], {
      settings: { ...off, autoFixCi: true },
      spend: { blocked: true, todayUsd: 50, capUsd: 50, reason: "Daily spend cap" },
      fix: async () => {
        throw new Error("should not fix");
      },
      review: async () => undefined,
    });
    expect(started).toEqual([]);
  });
});
