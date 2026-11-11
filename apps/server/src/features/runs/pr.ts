import { defaultCommitMessage, formatPrBody, type Run } from "@flightdeck/shared";
import { createGithubClient } from "../github/index.ts";
import { createJiraClient } from "../jira/index.ts";
import { listImprovements } from "../improvements/index.ts";
import { latestHandoff } from "../handoffs/store.ts";
import { getRepo } from "../repos/index.ts";
import { createSecretStore } from "../secrets/index.ts";
import { getSettings } from "../settings/index.ts";
import { listEvents } from "./store.ts";
import { commitLogical, pushBranch } from "../worktree/index.ts";
import { appendFileSync, existsSync } from "node:fs";
import { join } from "node:path";
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
  await commitRun(run, repo.commitConvention);
  if (run.worktreePath) await pushBranch(run.worktreePath, run.branch);
  const pr = await createGithubClient().createPr({
    owner: run.repoSlug.split("/")[0] ?? repo.owner,
    name: run.repoSlug.split("/")[1] ?? repo.name,
    title: `${run.issueKey} ${run.issueTitle}`,
    body: prBody(run, repo.testCommand),
    draft: getSettings().prDraft,
    cwd: run.worktreePath || undefined,
  });
  const updated =
    updateRun(run.id, {
      prUrl: pr.url,
      prNumber: pr.number,
      phase: "pr",
      status: "completed",
      finishedAt: new Date().toISOString(),
    }) ?? run;
  await commentIssue(updated, pr.url);
  await commentCost(updated);
  return updated;
}

async function commitRun(run: Run, convention: string): Promise<void> {
  if (!run.worktreePath) return;
  applyQueuedNotes(run);
  const impl = latestHandoff(run.id, "implement");
  const files = impl && impl.kind === "implement" ? impl.filesChanged : [];
  await commitLogical(run.worktreePath, files, (file) =>
    defaultCommitMessage(run.issueKey, file === "all" || file === "remaining" ? run.issueTitle : file, convention),
  );
}

function applyQueuedNotes(run: Run): void {
  if (!run.worktreePath) return;
  const notes = listImprovements().filter(
    (i) => i.kind === "claude_md_note" && i.status === "queued" && i.repoSlug === run.repoSlug,
  );
  if (!notes.length) return;
  const path = join(run.worktreePath, "CLAUDE.md");
  const block = notes.map((n) => `\n## From Flightdeck (${run.issueKey})\n${n.patch || n.detail}\n`).join("");
  if (existsSync(path)) appendFileSync(path, block);
  else appendFileSync(path, `# ${run.repoSlug}\n${block}`);
}

function prBody(run: Run, testCommand: string): string {
  const impl = latestHandoff(run.id, "implement");
  const files = impl && impl.kind === "implement" ? impl.filesChanged : [];
  return formatPrBody({
    why: `Implement ${run.issueKey}: ${run.issueTitle}`,
    summary: `Agent run on ${run.repoSlug} (${run.branch}).`,
    changes: files.length ? files : ["See the diff on this PR."],
    tested: testCommand ? `Ran \`${testCommand}\` in the worktree.` : "See transcript.",
    remaining: "CI on GitHub.",
    issues: [run.issueKey],
  });
}

async function commentCost(run: Run): Promise<void> {
  if (!run.prNumber) return;
  const usd = listEvents(run.id).reduce((s, e) => s + (e.usd ?? 0), 0);
  const [owner, name] = run.repoSlug.split("/");
  await createGithubClient().commentPr(
    owner ?? "",
    name ?? "",
    run.prNumber,
    `Flightdeck run cost: **$${usd.toFixed(2)}** of a $${run.capUsd.toFixed(2)} cap (${listEvents(run.id).length} transcript events).`,
  );
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
  await createJiraClient().comment({
    siteUrl: settings.jiraSiteUrl,
    email: settings.jiraEmail,
    token,
    key: run.issueId.replace("jira:", ""),
    body,
  });
}
