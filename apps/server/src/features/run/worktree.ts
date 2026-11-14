import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { defaultExec, type ExecFn } from "../exec/index.ts";
import { gitAuthEnv } from "../github/git-auth.ts";
import { worktreesDir } from "../../paths.ts";

export function worktreePath(changeId: string): string {
  return join(worktreesDir(), changeId);
}

export function demoWorktree(changeId: string, slug: string): { path: string; branch: string } {
  const branch = `flightdeck/${slug.replace(/[^a-zA-Z0-9._/-]+/g, "-").slice(0, 40)}-${changeId.slice(0, 8)}`;
  return { path: worktreePath(changeId), branch };
}

export async function addWorktree(
  repoPath: string,
  dest: string,
  branch: string,
  exec: ExecFn = defaultExec,
): Promise<void> {
  mkdirSync(join(dest, ".."), { recursive: true });
  const base = await defaultBase(repoPath, exec);
  const r = await exec("git", ["worktree", "add", "-b", branch, dest, base], { cwd: repoPath, timeoutMs: 60_000 });
  if (r.code !== 0) throw new Error(r.stderr || "git worktree add failed");
}

export async function removeWorktree(repoPath: string, dest: string, exec: ExecFn = defaultExec): Promise<void> {
  if (process.env.FLIGHTDECK_DEMO === "1") {
    if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
    return;
  }
  await exec("git", ["worktree", "remove", "--force", dest], { cwd: repoPath, timeoutMs: 30_000 });
  if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
}

export async function commitAll(dest: string, message: string, exec: ExecFn = defaultExec): Promise<void> {
  await exec("git", ["add", "-A"], { cwd: dest });
  const r = await exec("git", ["commit", "-m", message], { cwd: dest });
  if (r.code !== 0 && !/nothing to commit/i.test(r.stdout + r.stderr)) {
    throw new Error(r.stderr || "git commit failed");
  }
}

export async function pushBranch(dest: string, branch: string, exec: ExecFn = defaultExec): Promise<void> {
  const r = await exec("git", ["push", "-u", "origin", branch], {
    cwd: dest,
    timeoutMs: 120_000,
    env: await gitAuthEnv(),
  });
  if (r.code !== 0) throw new Error(r.stderr || "git push failed");
}

export async function defaultBase(repoPath: string, exec: ExecFn = defaultExec): Promise<string> {
  const symbolic = await exec("git", ["rev-parse", "--abbrev-ref", "origin/HEAD"], { cwd: repoPath });
  if (symbolic.code === 0 && symbolic.stdout.trim()) return symbolic.stdout.trim();
  for (const name of ["origin/main", "origin/master", "main", "master"]) {
    const r = await exec("git", ["rev-parse", "--verify", name], { cwd: repoPath });
    if (r.code === 0) return name;
  }
  return "HEAD";
}

export async function runGates(cwd: string, exec: ExecFn = defaultExec): Promise<{ ok: boolean; detail: string }> {
  const lines: string[] = [];
  for (const name of ["test", "lint", "typecheck", "build"] as const) {
    const r = await exec("pnpm", ["run", "--if-present", name], { cwd, timeoutMs: 180_000 });
    lines.push(`pnpm ${name}: exit ${r.code}`);
    if (r.code !== 0) return { ok: false, detail: `${name} failed\n${r.stderr || r.stdout}` };
  }
  return { ok: true, detail: lines.join("\n") };
}
