export async function buildFixPrompt(run: { repoSlug: string; prNumber?: number }): Promise<string> {
  const lines = ["Fix CI failures and PR review comments in this worktree."];
  if (!run.prNumber || process.env.FLIGHTDECK_DEMO === "1") return lines.join("\n");
  const [owner, name] = run.repoSlug.split("/");
  const { createGithubClient } = await import("../github/index.ts");
  const gh = createGithubClient();
  lines.push("Checks:", await gh.prChecks(owner ?? "", name ?? "", run.prNumber));
  lines.push("Review comments:", await gh.prComments(owner ?? "", name ?? "", run.prNumber));
  return lines.join("\n");
}
