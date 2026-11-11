import { getIssue, rememberIssue } from "../issues/index.ts";
import { createJiraClient } from "../jira/index.ts";
import { getSettings } from "../settings/index.ts";
import { createSecretStore } from "../secrets/index.ts";

export async function splitIssue(issueId: string): Promise<{ created: string[] }> {
  const issue = await getIssue(issueId);
  if (!issue) throw new Error("Issue not found");
  if (issue.source !== "jira" || issue.repos.length < 2) {
    throw new Error("Only a Jira issue with multiple repo labels can split");
  }
  if (process.env.FLIGHTDECK_DEMO === "1") {
    const created = issue.repos.map((r) => {
      const id = `jira:${issue.key}-${r.name}`;
      rememberIssue({
        ...issue,
        id,
        key: `${issue.key}-${r.name}`,
        repos: [{ ...r, registered: true }],
        repoWarning: "none",
        parentId: issue.id,
      });
      return id;
    });
    rememberIssue({ ...issue, parentId: undefined });
    return { created };
  }
  const settings = getSettings();
  const token = await createSecretStore().get();
  if (!settings.jiraSiteUrl || !settings.jiraEmail || !token) throw new Error("Jira is not connected");
  const created: string[] = [];
  for (const repo of issue.repos) {
    const sub = await createJiraClient().createSubtask({
      siteUrl: settings.jiraSiteUrl,
      email: settings.jiraEmail,
      token,
      parentKey: issue.key,
      title: `${issue.title} (${repo.owner}/${repo.name})`,
      body: issue.body,
      labels: [repo.label ?? `${settings.labelPrefix}${repo.owner}/${repo.name}`],
    });
    created.push(sub.key);
  }
  return { created };
}
