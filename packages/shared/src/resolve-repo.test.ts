import { describe, expect, it } from "vitest";
import { resolveRepos } from "./resolve-repo.ts";

const visible = [
  { owner: "acme", name: "web" },
  { owner: "acme", name: "api" },
  { owner: "other", name: "web" },
];

describe("resolveRepos", () => {
  it("matches owner/repo against gh-visible repos", () => {
    const r = resolveRepos([{ owner: "acme", name: "web", label: "gh:acme/web" }], visible);
    expect(r.warning).toBe("none");
    expect(r.resolved).toEqual([{ owner: "acme", name: "web" }]);
  });

  it("treats a unique bare name as resolved", () => {
    const r = resolveRepos([{ owner: "", name: "api", label: "gh:api" }], visible);
    expect(r.warning).toBe("none");
    expect(r.resolved[0]?.name).toBe("api");
  });

  it("flags an ambiguous bare name and returns guesses", () => {
    const r = resolveRepos([{ owner: "", name: "web", label: "gh:web" }], visible);
    expect(r.warning).toBe("multiple");
    expect(r.guesses.length).toBe(2);
  });

  it("uses a remembered project pick", () => {
    const r = resolveRepos([], visible, { owner: "acme", name: "api" });
    expect(r.resolved).toEqual([{ owner: "acme", name: "api" }]);
  });
});
