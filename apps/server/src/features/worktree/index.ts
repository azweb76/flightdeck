import { existsSync } from "node:fs";
import { join } from "node:path";
import { defaultExec, type ExecFn } from "../exec/index.ts";

export type Worktree = { path: string; branch: string };

export async function createWorktree(
  clonePath: string,
  issueKey: string,
  baseBranch: string,
  exec: ExecFn = defaultExec,
): Promise<Worktree> {
  const safe = issueKey.replace(/[^A-Za-z0-9._-]+/g, "-");
  const branch = `agent/${safe}`;
  const path = join(clonePath, "..", "worktrees", safe);
  await exec("git", ["fetch", "origin", baseBranch], { cwd: clonePath });
  const add = await exec(
    "git",
    ["worktree", "add", "-B", branch, path, `origin/${baseBranch}`],
    { cwd: clonePath },
  );
  if (add.code !== 0) throw new Error(add.stderr || "git worktree add failed");
  return { path, branch };
}

/** Worktree on an existing PR head branch (authored Fix). */
export async function ensureNamedWorktree(
  clonePath: string,
  branch: string,
  existingPath?: string,
  exec: ExecFn = defaultExec,
): Promise<Worktree> {
  const safe = branch.replace(/[^A-Za-z0-9._-]+/g, "-");
  const path = existingPath && existsSync(existingPath) ? existingPath : join(clonePath, "..", "worktrees", safe);
  await exec("git", ["fetch", "origin", branch], { cwd: clonePath });
  if (existingPath && existsSync(existingPath)) return { path: existingPath, branch };
  const add = await exec("git", ["worktree", "add", "-B", branch, path, `origin/${branch}`], { cwd: clonePath });
  if (add.code !== 0) throw new Error(add.stderr || "git worktree add failed");
  return { path, branch };
}

/** Reuse an existing worktree on resume/fix/answer; fetch then continue. */
export async function ensureWorktree(
  clonePath: string,
  issueKey: string,
  baseBranch: string,
  existingPath?: string,
  exec: ExecFn = defaultExec,
): Promise<Worktree> {
  const safe = issueKey.replace(/[^A-Za-z0-9._-]+/g, "-");
  const branch = `agent/${safe}`;
  if (existingPath && existsSync(existingPath)) {
    await exec("git", ["fetch", "origin", baseBranch], { cwd: clonePath });
    return { path: existingPath, branch };
  }
  return createWorktree(clonePath, issueKey, baseBranch, exec);
}

export async function removeWorktree(
  clonePath: string,
  worktreePath: string,
  branch: string,
  exec: ExecFn = defaultExec,
): Promise<void> {
  await exec("git", ["worktree", "remove", "--force", worktreePath], { cwd: clonePath });
  await exec("git", ["branch", "-D", branch], { cwd: clonePath });
}

export async function commitAll(
  worktreePath: string,
  message: string,
  exec: ExecFn = defaultExec,
): Promise<void> {
  await exec("git", ["add", "-A"], { cwd: worktreePath });
  const commit = await exec("git", ["commit", "-m", message], { cwd: worktreePath });
  if (commit.code !== 0 && !commit.stdout.includes("nothing to commit")) {
    throw new Error(commit.stderr || "git commit failed");
  }
}

/** One commit per changed path when the implementer listed files. */
export async function commitLogical(
  worktreePath: string,
  files: string[],
  messageFor: (file: string) => string,
  exec: ExecFn = defaultExec,
): Promise<void> {
  const unique = [...new Set(files.filter(Boolean))];
  if (unique.length === 0) {
    await commitAll(worktreePath, messageFor("all"), exec);
    return;
  }
  for (const file of unique) {
    await exec("git", ["add", "--", file], { cwd: worktreePath });
    const commit = await exec("git", ["commit", "-m", messageFor(file)], { cwd: worktreePath });
    if (commit.code !== 0 && !commit.stdout.includes("nothing to commit")) {
      throw new Error(commit.stderr || `git commit failed for ${file}`);
    }
  }
  await commitAll(worktreePath, messageFor("remaining"), exec);
}

export async function pushBranch(
  worktreePath: string,
  branch: string,
  exec: ExecFn = defaultExec,
): Promise<void> {
  const r = await exec("git", ["push", "-u", "origin", branch], { cwd: worktreePath, timeoutMs: 60_000 });
  if (r.code !== 0) throw new Error(r.stderr || "git push failed");
}
