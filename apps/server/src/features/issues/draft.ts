import type { Repo } from "@flightdeck/shared";
import { createGithubClient } from "../github/index.ts";
import { createJiraClient } from "../jira/index.ts";
import { createSecretStore } from "../secrets/index.ts";
import { getSettings } from "../settings/index.ts";
import { rememberIssue } from "./index.ts";

export async function draftGithubIssue(repo: Repo, title: string, body: string): Promise<{ id: string }> {
  if (process.env.FLIGHTDECK_DEMO === "1") {
    return rememberGithub(repo, "draft", title, body, "");
  }
  const created = await createGithubClient().createIssue(repo.owner, repo.name, title, body);
  return rememberGithub(repo, String(created.number), title, body, created.url);
}

export async function draftJiraIssue(projectKey: string, title: string, body: string): Promise<{ id: string }> {
  const settings = getSettings();
  if (process.env.FLIGHTDECK_DEMO === "1") {
    const key = `${projectKey}-DRAFT`;
    rememberIssue({
      id: `jira:${key}`,
      source: "jira",
      key,
      title,
      body,
      url: "",
      stage: "new",
      repos: [],
      repoWarning: "missing",
      updatedAt: new Date().toISOString(),
    });
    return { id: `jira:${key}` };
  }
  const token = await createSecretStore().get();
  if (!settings.jiraSiteUrl || !settings.jiraEmail || !token) throw new Error("Jira is not connected");
  const created = await createJiraClient().createIssue({
    siteUrl: settings.jiraSiteUrl,
    email: settings.jiraEmail,
    token,
    projectKey,
    title,
    body,
  });
  rememberIssue({
    id: `jira:${created.key}`,
    source: "jira",
    key: created.key,
    title,
    body,
    url: `${settings.jiraSiteUrl.replace(/\/$/, "")}/browse/${created.key}`,
    stage: "new",
    repos: [],
    repoWarning: "missing",
    updatedAt: new Date().toISOString(),
  });
  return { id: `jira:${created.key}` };
}

function rememberGithub(repo: Repo, number: string, title: string, body: string, url: string): { id: string } {
  const id = `github:${repo.owner}/${repo.name}#${number}`;
  rememberIssue({
    id,
    source: "github",
    key: `${repo.owner}/${repo.name}#${number}`,
    title,
    body,
    url,
    stage: "new",
    repos: [{ owner: repo.owner, name: repo.name, registered: true }],
    repoWarning: "none",
    updatedAt: new Date().toISOString(),
  });
  return { id };
}
