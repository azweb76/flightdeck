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
