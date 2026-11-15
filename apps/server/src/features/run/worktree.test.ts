import { describe, expect, it } from "vitest";
import { demoWorktree } from "./worktree.ts";

describe("worktrees", () => {
  it("gives each change its own path and branch on the same repo", () => {
    const a = demoWorktree("aaa-aaa-aaa", "acme-web");
    const b = demoWorktree("bbb-bbb-bbb", "acme-web");
    expect(a.path).not.toBe(b.path);
    expect(a.branch).not.toBe(b.branch);
    expect(a.path).toContain("aaa-aaa-aaa");
    expect(b.path).toContain("bbb-bbb-bbb");
  });
});
