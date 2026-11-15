import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { defaultExec } from "../exec/index.ts";
import { addWorktree, nestedWorktree, pruneRepoWorktrees, removeWorktree } from "./worktree.ts";

describe("worktrees", () => {
  const prevDemo = process.env.FLIGHTDECK_DEMO;

  afterEach(() => {
    if (prevDemo === undefined) delete process.env.FLIGHTDECK_DEMO;
    else process.env.FLIGHTDECK_DEMO = prevDemo;
  });

  it("nests each change under the clone .flightdeck folder", () => {
    const repo = "/tmp/flightdeck-demo/acme/web";
    const a = nestedWorktree(repo, "aaa-aaa-aaa");
    const b = nestedWorktree(repo, "bbb-bbb-bbb");
    expect(a.path).toBe(join(repo, ".flightdeck", "aaa-aaa-aaa"));
    expect(b.path).toBe(join(repo, ".flightdeck", "bbb-bbb-bbb"));
    expect(a.branch).not.toBe(b.branch);
  });

  it("adds two worktrees on one repo and removes them with prune and branch delete", async () => {
    delete process.env.FLIGHTDECK_DEMO;
    const repo = mkdtempSync(join(tmpdir(), "fd-wt-repo-"));
    await gitInit(repo);
    const a = nestedWorktree(repo, "change-one");
    const b = nestedWorktree(repo, "change-two");
    await addWorktree(repo, a.path, a.branch);
    await addWorktree(repo, b.path, b.branch);
    const exclude = readFileSync(join(repo, ".git", "info", "exclude"), "utf8");
    expect(exclude).toContain(".flightdeck/");
    const listed = await defaultExec("git", ["worktree", "list"], { cwd: repo });
    expect(listed.stdout).toContain(a.path);
    expect(listed.stdout).toContain(b.path);
    await removeWorktree(repo, a.path, a.branch);
    await removeWorktree(repo, b.path, b.branch);
    await pruneRepoWorktrees(repo);
    const after = await defaultExec("git", ["worktree", "list"], { cwd: repo });
    expect(after.stdout).not.toContain(a.path);
    expect(after.stdout).not.toContain(b.path);
    const branches = await defaultExec("git", ["branch"], { cwd: repo });
    expect(branches.stdout).not.toContain(a.branch);
    expect(branches.stdout).not.toContain(b.branch);
  });
});

async function gitInit(repo: string): Promise<void> {
  mkdirSync(repo, { recursive: true });
  const git = async (...args: string[]) => {
    const r = await defaultExec("git", args, { cwd: repo });
    if (r.code !== 0) throw new Error(r.stderr || args.join(" "));
  };
  await git("init");
  await git("config", "user.email", "dan@example.com");
  await git("config", "user.name", "Dan");
  writeFileSync(join(repo, "README.md"), "demo\n");
  await git("add", "README.md");
  await git("commit", "-m", "init");
}
