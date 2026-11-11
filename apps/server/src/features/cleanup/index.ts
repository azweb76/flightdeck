import { defaultExec, type ExecFn } from "../exec/index.ts";
import { getRepo } from "../repos/index.ts";
import { listRuns, updateRun } from "../runs/store.ts";
import { removeWorktree } from "../worktree/index.ts";
import { publish } from "../events/index.ts";

export async function cleanupMerged(exec: ExecFn = defaultExec): Promise<number> {
  let n = 0;
  for (const run of listRuns()) {
    if (!run.prNumber || !run.worktreePath) continue;
    const repo = getRepo(run.repoId);
    if (!repo) continue;
    const r = await exec("gh", [
      "pr",
      "view",
      String(run.prNumber),
      "--repo",
      run.repoSlug,
      "--json",
      "state",
    ]);
    if (r.code !== 0) continue;
    const state = String((JSON.parse(r.stdout || "{}") as { state?: string }).state ?? "");
    if (state !== "MERGED" && state !== "CLOSED") continue;
    try {
      await removeWorktree(repo.localPath, run.worktreePath, run.branch, exec);
      updateRun(run.id, { worktreePath: "" });
      n += 1;
    } catch {
      /* keep for inspection */
    }
  }
  if (n) publish("runs.updated");
  return n;
}
