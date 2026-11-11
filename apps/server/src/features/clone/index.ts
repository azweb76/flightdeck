import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { createGithubClient } from "../github/index.ts";
import { defaultExec, type ExecFn } from "../exec/index.ts";
import { getSettings } from "../settings/index.ts";
import { patchRepo } from "../repos/index.ts";
import { ensureRepoRow } from "../discovery/index.ts";

export function cloneFolder(): string {
  const set = getSettings().workspaceFolder.trim();
  if (set) return set.replace(/^~/, homedir());
  return join(homedir(), ".flightdeck", "repos");
}

export async function ensureClone(
  owner: string,
  name: string,
  exec: ExecFn = defaultExec,
): Promise<{ localPath: string }> {
  const repo = ensureRepoRow(owner, name);
  if (repo.localPath && existsSync(join(repo.localPath, ".git"))) {
    await exec("git", ["fetch", "origin"], { cwd: repo.localPath });
    return { localPath: repo.localPath };
  }
  const dest = join(cloneFolder(), owner, name);
  if (existsSync(join(dest, ".git"))) {
    await exec("git", ["fetch", "origin"], { cwd: dest });
    patchRepo(repo.id, { localPath: dest });
    return { localPath: dest };
  }
  const cloned = await createGithubClient(exec).cloneRepo(owner, name, dest);
  if (!cloned.ok) throw new Error(cloned.detail);
  patchRepo(repo.id, { localPath: dest });
  return { localPath: dest };
}
