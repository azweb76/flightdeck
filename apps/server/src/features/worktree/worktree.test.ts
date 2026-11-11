import { describe, expect, it } from "vitest";
import { ensureWorktree } from "./index.ts";

describe("ensureWorktree", () => {
  it("reuses an existing path instead of git worktree add -B", async () => {
    const calls: string[] = [];
    const exec = async (cmd: string, args: string[]) => {
      calls.push([cmd, ...args].join(" "));
      return { code: 0, stdout: "", stderr: "" };
    };
    const wt = await ensureWorktree("/tmp/clone", "PROJ-1", "main", "/workspace", exec);
    expect(wt.path).toBe("/workspace");
    expect(calls.some((c) => c.includes("worktree add"))).toBe(false);
    expect(calls.some((c) => c.includes("fetch"))).toBe(true);
  });
});
