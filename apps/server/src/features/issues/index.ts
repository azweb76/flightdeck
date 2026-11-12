import type { Issue } from "@flightdeck/shared";
import { createGithubClient } from "../github/index.ts";
import { createJiraClient, jiraSearchJql } from "../jira/index.ts";
import { createSecretStore } from "../secrets/index.ts";
import { getSettings } from "../settings/index.ts";
import { loadIssues, upsertIssue } from "./store.ts";
import { publish } from "../events/index.ts";

export { loadIssue, loadIssues, setIssueRepo, upsertIssue } from "./store.ts";

export async function syncIssues(): Promise<Issue[]> {
  if (process.env.FLIGHTDECK_DEMO === "1") return loadIssues();
  const settings = getSettings();
  await syncGithub();
  await syncJira(settings);
  publish("issues.updated");
  return loadIssues();
}

async function syncGithub(): Promise<void> {
  const gh = createGithubClient();
  const status = await gh.status();
  if (!status.loggedIn) return;
  for (const i of await gh.listAssignedIssues()) {
    upsertIssue({
      id: i.id,
      source: "github",
      key: `${i.owner}/${i.name}#${i.number}`,
      title: i.title,
      body: i.body,
      url: i.url,
      repoSlug: `${i.owner}/${i.name}`,
      updatedAt: i.updatedAt,
      saved: true,
    });
  }
}

async function syncJira(settings: ReturnType<typeof getSettings>): Promise<void> {
  if (!settings.jiraConfigured || !settings.jiraSiteUrl || !settings.jiraEmail) return;
  const token = await createSecretStore().get();
  if (!token) return;
  const issues = await createJiraClient().search({
    siteUrl: settings.jiraSiteUrl,
    email: settings.jiraEmail,
    token,
    jql: jiraSearchJql(settings.jiraJql),
  });
  for (const i of issues) {
    upsertIssue({
      id: `jira:${i.key}`,
      source: "jira",
      key: i.key,
      title: i.title,
      body: i.body,
      url: i.url,
      updatedAt: i.updatedAt,
      saved: true,
    });
  }
}
