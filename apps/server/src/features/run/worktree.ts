import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { defaultExec, type ExecFn } from "../exec/index.ts";
import { gitAuthEnv } from "../github/git-auth.ts";
import { listRememberedRepos } from "../clone/index.ts";

export function nestedWorktree(repoDir: string, changeId: string): { path: string; branch: string } {
  const branch = `flightdeck/${changeId.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 8)}`;
  return { path: join(repoDir, ".flightdeck", changeId), branch };
}

export function ignoreFlightdeckDir(repoDir: string): void {
  const file = join(repoDir, ".git", "info", "exclude");
  mkdirSync(dirname(file), { recursive: true });
  const cur = existsSync(file) ? readFileSync(file, "utf8") : "";
  if (cur.split(/\r?\n/).includes(".flightdeck/")) return;
  const pad = cur && !cur.endsWith("\n") ? "\n" : "";
  appendFileSync(file, `${pad}.flightdeck/\n`);
}

export async function addWorktree(
  repoDir: string,
  dest: string,
  branch: string,
  exec: ExecFn = defaultExec,
): Promise<void> {
  if (existsSync(join(dest, ".git")) || existsSync(join(dest, "HEAD"))) return;
  ignoreFlightdeckDir(repoDir);
  mkdirSync(join(dest, ".."), { recursive: true });
  const base = await defaultBase(repoDir, exec);
  const r = await exec("git", ["worktree", "add", "-b", branch, dest, base], { cwd: repoDir, timeoutMs: 60_000 });
  if (r.code !== 0) throw new Error(r.stderr || "git worktree add failed");
}

/** Detached worktree at a PR head commit in the app-managed clone. */
export async function addWorktreeAtCommit(
  repoDir: string,
  dest: string,
  commit: string,
  exec: ExecFn = defaultExec,
): Promise<void> {
  if (existsSync(join(dest, ".git")) || existsSync(join(dest, "HEAD"))) return;
  ignoreFlightdeckDir(repoDir);
  mkdirSync(join(dest, ".."), { recursive: true });
  const r = await exec("git", ["worktree", "add", "--detach", dest, commit], { cwd: repoDir, timeoutMs: 60_000 });
  if (r.code !== 0) throw new Error(r.stderr || "git worktree add at commit failed");
}

export async function removeWorktree(
  repoDir: string,
  dest: string,
  branch = "",
  exec: ExecFn = defaultExec,
): Promise<void> {
  if (process.env.FLIGHTDECK_DEMO === "1") {
    if (dest && existsSync(dest)) rmSync(dest, { recursive: true, force: true });
    return;
  }
  if (dest) await removeGitWorktree(repoDir, dest, exec);
  if (branch) await exec("git", ["branch", "-D", branch], { cwd: repoDir, timeoutMs: 15_000 });
  if (dest && existsSync(dest)) rmSync(dest, { recursive: true, force: true });
}

export async function pruneRepoWorktrees(repoDir: string, exec: ExecFn = defaultExec): Promise<void> {
  if (!existsSync(join(repoDir, ".git"))) return;
  await exec("git", ["worktree", "prune"], { cwd: repoDir, timeoutMs: 30_000 });
}

export async function pruneAllClones(exec: ExecFn = defaultExec): Promise<void> {
  if (process.env.FLIGHTDECK_DEMO === "1") return;
  for (const repo of listRememberedRepos()) {
    await pruneRepoWorktrees(repo.localPath, exec);
  }
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

export async function defaultBase(repoDir: string, exec: ExecFn = defaultExec): Promise<string> {
  const symbolic = await exec("git", ["rev-parse", "--abbrev-ref", "origin/HEAD"], { cwd: repoDir });
  if (symbolic.code === 0 && symbolic.stdout.trim()) return symbolic.stdout.trim();
  for (const name of ["origin/main", "origin/master", "main", "master"]) {
    const r = await exec("git", ["rev-parse", "--verify", name], { cwd: repoDir });
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

async function removeGitWorktree(repoDir: string, dest: string, exec: ExecFn): Promise<void> {
  if (!existsSync(join(repoDir, ".git"))) return;
  const first = await exec("git", ["worktree", "remove", "--force", dest], { cwd: repoDir, timeoutMs: 30_000 });
  if (first.code === 0) return;
  await exec("git", ["worktree", "prune"], { cwd: repoDir, timeoutMs: 30_000 });
  const retry = await exec("git", ["worktree", "remove", "--force", dest], { cwd: repoDir, timeoutMs: 30_000 });
  if (retry.code === 0 || !existsSync(dest)) return;
  throw new Error(retry.stderr || first.stderr || "Could not remove the worktree. Close files in that folder and archive again.");
}
