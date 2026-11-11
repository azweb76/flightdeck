import { describe, expect, it } from "vitest";
import { parseRepoLabels, repoLinkWarning } from "./labels.ts";

const prefix = "gh:";

describe("parseRepoLabels", () => {
  it("parses a single gh:owner/repo label", () => {
    expect(parseRepoLabels(["bug", "gh:acme/web"], prefix)).toEqual([
      { owner: "acme", name: "web", label: "gh:acme/web" },
    ]);
  });

  it("is case-insensitive on the prefix", () => {
    expect(parseRepoLabels(["GH:acme/api"], prefix)).toEqual([
      { owner: "acme", name: "api", label: "GH:acme/api" },
    ]);
  });

  it("returns empty when no repo label is present", () => {
    expect(parseRepoLabels(["bug", "priority/high"], prefix)).toEqual([]);
    expect(repoLinkWarning([])).toBe("missing");
  });

  it("returns every unique repo when several labels match", () => {
    const parsed = parseRepoLabels(["gh:acme/web", "gh:acme/api", "docs"], prefix);
    expect(parsed).toHaveLength(2);
    expect(repoLinkWarning(parsed)).toBe("multiple");
  });

  it("dedupes the same repo listed twice", () => {
    expect(parseRepoLabels(["gh:acme/web", "gh:acme/web"], prefix)).toHaveLength(1);
  });

  it("parses a bare repo name after the prefix", () => {
    expect(parseRepoLabels(["gh:web"], prefix)).toEqual([{ owner: "", name: "web", label: "gh:web" }]);
  });

  it("ignores a prefix match that is not a repo name", () => {
    expect(parseRepoLabels(["gh:/oops", "gh:acme/web/extra"], prefix)).toEqual([]);
  });

  it("honors a custom prefix", () => {
    expect(parseRepoLabels(["repo:acme/web", "gh:acme/api"], "repo:")).toEqual([
      { owner: "acme", name: "web", label: "repo:acme/web" },
    ]);
  });
});

describe("repoLinkWarning", () => {
  it("is none for exactly one repo", () => {
    expect(repoLinkWarning([{ owner: "a", name: "b", label: "gh:a/b" }])).toBe("none");
  });
});
