import { defaultCommitMessage, formatPrBody, type Run } from "@flightdeck/shared";
import { createGithubClient } from "../github/index.ts";
import { createJiraClient } from "../jira/index.ts";
import { getRepo } from "../repos/index.ts";
import { createSecretStore } from "../secrets/index.ts";
import { getSettings } from "../settings/index.ts";
import { commitAll, pushBranch } from "../worktree/index.ts";
import { updateRun } from "./store.ts";

export async function openPullRequest(run: Run): Promise<Run> {
  const repo = getRepo(run.repoId);
  if (!repo) throw new Error("repo missing");
  if (process.env.FLIGHTDECK_DEMO === "1") {
    return (
      updateRun(run.id, {
        prUrl: `https://github.com/${run.repoSlug}/pull/1`,
        prNumber: 1,
        phase: "pr",
        status: "completed",
        finishedAt: new Date().toISOString(),
      }) ?? run
    );
  }
  const message = defaultCommitMessage(run.issueKey, run.issueTitle, repo.commitConvention);
  if (run.worktreePath) {
    await commitAll(run.worktreePath, message);
    await pushBranch(run.worktreePath, run.branch);
  }
  const gh = createGithubClient();
  const [owner, name] = run.repoSlug.split("/");
  const body = formatPrBody({
    why: `Implement ${run.issueKey}: ${run.issueTitle}`,
    summary: `Agent run on ${run.repoSlug} (${run.branch}).`,
    changes: ["See the diff on this PR."],
    tested: repo.testCommand ? `Ran \`${repo.testCommand}\` in the worktree.` : "See transcript.",
    remaining: "CI on GitHub.",
    issues: [run.issueKey],
  });
  const settings = getSettings();
  const pr = await gh.createPr({
    owner: owner ?? repo.owner,
    name: name ?? repo.name,
    title: `${run.issueKey} ${run.issueTitle}`,
    body,
    draft: settings.prDraft,
    cwd: run.worktreePath || undefined,
  });
  const updated = updateRun(run.id, {
    prUrl: pr.url,
    prNumber: pr.number,
    phase: "pr",
    status: "completed",
    finishedAt: new Date().toISOString(),
  });
  await commentIssue(updated ?? run, pr.url);
  return updated ?? run;
}

async function commentIssue(run: Run, prUrl: string): Promise<void> {
  const body = `Flightdeck opened ${prUrl} for ${run.issueKey}.`;
  if (run.issueSource === "github") {
    const [owner, rest] = run.issueId.replace("github:", "").split("/");
    const num = Number((rest ?? "").split("#")[1]);
    if (owner && rest && num) {
      await createGithubClient().commentIssue(owner, rest.split("#")[0] ?? "", num, body);
    }
    return;
  }
  if (run.issueSource !== "jira") return;
  const settings = getSettings();
  const token = await createSecretStore().get();
  if (!settings.jiraSiteUrl || !settings.jiraEmail || !token) return;
  const key = run.issueId.replace("jira:", "");
  await createJiraClient().comment({
    siteUrl: settings.jiraSiteUrl,
    email: settings.jiraEmail,
    token,
    key,
    body,
  });
}
