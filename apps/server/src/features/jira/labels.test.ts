import { describe, expect, it } from "vitest";
import { parseLabelNames, repoSlugFromLabels, withRepoLabel } from "./labels.ts";

describe("jira repo labels", () => {
  it("reads repo:org/repo and ignores other labels", () => {
    expect(repoSlugFromLabels(["needs-review", "repo:acme/web", "prio"])).toBe("acme/web");
    expect(repoSlugFromLabels(["repo:not a slug", "Repo:acme/web"])).toBeUndefined();
    expect(repoSlugFromLabels([])).toBeUndefined();
  });

  it("replaces an existing repo: label", () => {
    expect(withRepoLabel(["needs-review", "repo:old/app"], "acme/api")).toEqual([
      "needs-review",
      "repo:acme/api",
    ]);
  });

  it("parses string labels and {name} objects", () => {
    expect(parseLabelNames({ labels: ["repo:acme/web", { name: "needs-review" }] })).toEqual([
      "repo:acme/web",
      "needs-review",
    ]);
  });
});
