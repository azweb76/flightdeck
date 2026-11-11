import type { Run } from "@flightdeck/shared";
import { defaultExec } from "../exec/index.ts";
import { createGithubClient } from "../github/index.ts";

export async function runDiff(run: Run): Promise<string> {
  if (run.worktreePath) {
    const local = await defaultExec("git", ["diff", "HEAD~1", "HEAD"], { cwd: run.worktreePath });
    if (local.stdout.trim()) return local.stdout;
    const staged = await defaultExec("git", ["diff"], { cwd: run.worktreePath });
    if (staged.stdout.trim()) return staged.stdout;
  }
  if (run.prNumber) {
    const [owner, name] = run.repoSlug.split("/");
    return createGithubClient().prDiff(owner ?? "", name ?? "", run.prNumber);
  }
  if (process.env.FLIGHTDECK_DEMO === "1") {
    return [
      "diff --git a/src/middleware/rateLimit.ts b/src/middleware/rateLimit.ts",
      "--- a/src/middleware/rateLimit.ts",
      "+++ b/src/middleware/rateLimit.ts",
      "@@ -1,4 +1,6 @@",
      " export function limit() {",
      "-  return 100;",
      "+  return 200;",
      " }",
    ].join("\n");
  }
  return "No diff yet.";
}
