import { describe, expect, it } from "vitest";
import { routeAfterReview } from "./severity.ts";

const clean = { kind: "review" as const, passed: true, findings: [], notes: "" };
const minor = {
  kind: "review" as const,
  passed: false,
  findings: [{ severity: "minor" as const, title: "nits", detail: "style" }],
  notes: "",
};
const major = {
  kind: "review" as const,
  passed: false,
  findings: [{ severity: "major" as const, title: "gap", detail: "missing tests" }],
  notes: "",
};

describe("routeAfterReview", () => {
  it("opens the PR when no rounds remain", () => {
    expect(routeAfterReview(major, 2, 2)).toBe("pr");
  });

  it("sends major findings back to the planner", () => {
    expect(routeAfterReview(major, 1, 2)).toBe("plan");
  });

  it("sends minor findings to the implementer", () => {
    expect(routeAfterReview(minor, 1, 2)).toBe("implement");
  });

  it("opens the PR early on a clean pass", () => {
    expect(routeAfterReview(clean, 1, 3)).toBe("pr");
  });
});
