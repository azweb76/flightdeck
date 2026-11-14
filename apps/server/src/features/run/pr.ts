import type { Change } from "@flightdeck/shared";
import { createGithubClient } from "../github/index.ts";
import { createJiraClient } from "../jira/index.ts";
import { createSecretStore } from "../secrets/index.ts";
import { getSettings } from "../settings/index.ts";
import { defaultBase } from "./worktree.ts";

export async function openDraftPr(change: Change): Promise<{ number: number; url: string }> {
  const [owner, name] = change.repoSlug.split("/");
  if (!owner || !name) throw new Error("Pick a GitHub repo");
  if (process.env.FLIGHTDECK_DEMO === "1") {
    return { number: 42, url: `https://github.com/${change.repoSlug}/pull/42` };
  }
  const gh = createGithubClient();
  const repoPath = change.worktreePath;
  const base = (await defaultBase(repoPath)).replace(/^origin\//, "");
  return gh.createDraftPr(owner, name, {
    title: change.title,
    body: prBody(change),
    head: change.branch,
    base,
  });
}

export function prBody(change: Change): string {
  return `Draft PR from Flightdeck for ${change.issueKey}.\n\n${change.issueUrl ? `Issue: ${change.issueUrl}\n` : ""}The implementation plan stays in Flightdeck, not in the repo.`;
}

export async function commentPrLink(change: Change, prUrl: string): Promise<void> {
  const body = `Flightdeck opened a draft PR: ${prUrl}`;
  if (process.env.FLIGHTDECK_DEMO === "1") return;
  if (change.issueSource === "github") {
    const slug = change.repoSlug || change.issueId.replace(/^github:/, "").split("#")[0] || "";
    const [owner, name] = slug.split("/");
    const number = Number(change.issueId.split("#")[1]);
    if (!owner || !name || !number) return;
    await createGithubClient().commentIssue(owner, name, number, body);
    return;
  }
  if (change.issueSource === "jira") {
    const settings = getSettings();
    const token = await createSecretStore().get();
    if (!settings.jiraSiteUrl || !settings.jiraEmail || !token) return;
    await createJiraClient().commentIssue({
      siteUrl: settings.jiraSiteUrl,
      email: settings.jiraEmail,
      token,
      key: change.issueKey,
      body,
    });
  }
}

