import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { getDb } from "../db/index.ts";
import { defaultExec, type ExecFn } from "../exec/index.ts";
import { createGithubClient } from "../github/index.ts";
import { getSettings } from "../settings/index.ts";
import { reposDir } from "../../paths.ts";

export function cloneRoot(): string {
  const set = getSettings().workspaceFolder.trim();
  if (set) return set.replace(/^~/, homedir());
  return reposDir();
}

export function repoPath(owner: string, name: string): string {
  return join(cloneRoot(), owner, name);
}

export function rememberRepo(owner: string, name: string, localPath: string): void {
  getDb()
    .prepare(
      `INSERT INTO repos (owner, name, local_path) VALUES (?,?,?)
       ON CONFLICT(owner, name) DO UPDATE SET local_path = excluded.local_path`,
    )
    .run(owner, name, localPath);
}

export function listRememberedRepos(): { owner: string; name: string; localPath: string }[] {
  const rows = getDb().prepare("SELECT owner, name, local_path FROM repos ORDER BY name").all() as {
    owner: string;
    name: string;
    local_path: string;
  }[];
  return rows.map((r) => ({ owner: r.owner, name: r.name, localPath: r.local_path }));
}

export async function ensureClone(
  owner: string,
  name: string,
  exec: ExecFn = defaultExec,
): Promise<{ localPath: string }> {
  if (process.env.FLIGHTDECK_DEMO === "1") {
    const dest = repoPath(owner, name);
    rememberRepo(owner, name, dest);
    return { localPath: dest };
  }
  const dest = repoPath(owner, name);
  mkdirSync(join(dest, ".."), { recursive: true });
  if (existsSync(join(dest, ".git"))) {
    await exec("git", ["fetch", "origin"], { cwd: dest, timeoutMs: 60_000 });
    rememberRepo(owner, name, dest);
    return { localPath: dest };
  }
  const cloned = await createGithubClient(exec).cloneRepo(owner, name, dest);
  if (!cloned.ok) throw new Error(cloned.detail);
  rememberRepo(owner, name, dest);
  return { localPath: dest };
}
