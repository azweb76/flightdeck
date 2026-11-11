import { describe, expect, it } from "vitest";
import { mapJira } from "./index.ts";

const visible = [{ owner: "acme", name: "web" }];

describe("mapJira", () => {
  it("warns when no repo label is present", () => {
    const issue = mapJira(
      { key: "PROJ-1", title: "x", body: "", url: "", labels: ["bug"], updatedAt: "t" },
      visible,
      "gh:",
    );
    expect(issue.repoWarning).toBe("missing");
    expect(issue.repos).toEqual([]);
  });

  it("warns when several repo labels are present", () => {
    const issue = mapJira(
      {
        key: "PROJ-2",
        title: "x",
        body: "",
        url: "",
        labels: ["gh:acme/web", "gh:acme/api"],
        updatedAt: "t",
      },
      visible,
      "gh:",
    );
    expect(issue.repoWarning).toBe("multiple");
    expect(issue.repos).toHaveLength(2);
  });

  it("links a single visible repo", () => {
    const issue = mapJira(
      { key: "PROJ-3", title: "x", body: "", url: "", labels: ["gh:acme/web"], updatedAt: "t" },
      visible,
      "gh:",
    );
    expect(issue.repoWarning).toBe("none");
    expect(issue.repos[0]).toMatchObject({ owner: "acme", name: "web", registered: true });
  });
});
