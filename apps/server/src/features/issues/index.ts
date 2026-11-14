import type { Issue } from "@flightdeck/shared";
import { CACHE_KEYS, getCache, TTL } from "../cache/index.ts";
import { publish } from "../events/index.ts";
import { createGithubClient, type GithubClient } from "../github/index.ts";
import { createJiraClient, jiraSearchJql, type JiraClient } from "../jira/index.ts";
import { createSecretStore } from "../secrets/index.ts";
import { getSettings } from "../settings/index.ts";
import { loadIssues, setIssueRepo as writeIssueRepo, upsertIssue } from "./store.ts";

export { loadIssue, loadIssues, upsertIssue } from "./store.ts";

export type IssuesDeps = {
  github?: GithubClient;
  jira?: JiraClient;
  token?: () => Promise<string | undefined>;
};

export async function listIssues(deps: IssuesDeps = {}): Promise<Issue[]> {
  await maybeSync(false, deps);
  return loadIssues();
}

export async function syncIssues(deps: IssuesDeps = {}): Promise<Issue[]> {
  if (process.env.FLIGHTDECK_DEMO !== "1") {
    getCache().invalidate(CACHE_KEYS.githubIssues);
    getCache().invalidate(CACHE_KEYS.jiraSearchAll);
  }
  await maybeSync(true, deps);
  return loadIssues();
}

export function setIssueRepo(id: string, repoSlug: string): Issue {
  const issue = writeIssueRepo(id, repoSlug);
  publish("issues.updated");
  return issue;
}

async function maybeSync(force: boolean, deps: IssuesDeps): Promise<void> {
  if (process.env.FLIGHTDECK_DEMO === "1") return;
  await getCache().get(
    CACHE_KEYS.issuesSync,
    async () => {
      const before = fingerprint(loadIssues());
      await syncGithub(deps);
      await syncJira(deps);
      if (fingerprint(loadIssues()) !== before) publish("issues.updated");
      return true;
    },
    TTL.issuesSync,
    { force },
  );
}

async function syncGithub(deps: IssuesDeps): Promise<void> {
  const gh = deps.github ?? createGithubClient();
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

async function syncJira(deps: IssuesDeps): Promise<void> {
  const settings = getSettings();
  if (!settings.jiraConfigured || !settings.jiraSiteUrl || !settings.jiraEmail) return;
  const token = deps.token ? await deps.token() : await createSecretStore().get();
  if (!token) return;
  const issues = await (deps.jira ?? createJiraClient()).search({
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

function fingerprint(issues: Issue[]): string {
  return JSON.stringify(
    issues.map((i) => [i.id, i.title, i.body, i.url, i.repoSlug ?? "", i.updatedAt, i.saved]),
  );
}
