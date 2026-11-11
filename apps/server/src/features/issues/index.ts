import {
  parseRepoLabels,
  repoLinkWarning,
  type Issue,
  type LinkedRepo,
  type Repo,
} from "@flightdeck/shared";
import { createGithubClient, type GithubClient } from "../github/index.ts";
import { createJiraClient, type JiraClient } from "../jira/index.ts";
import { listRepos } from "../repos/index.ts";
import { createSecretStore } from "../secrets/index.ts";
import { getSettings } from "../settings/index.ts";
import { demoIssues } from "./demo.ts";

export type IssueDeps = {
  github?: GithubClient;
  jira?: JiraClient;
};

export async function listIssues(
  query: { source?: "all" | "jira" | "github"; repo?: string },
  deps: IssueDeps = {},
): Promise<{ issues: Issue[]; errors: string[] }> {
  const settings = getSettings();
  const repos = listRepos();
  const errors: string[] = [];
  const source = query.source ?? "all";
  const [jira, github] = await Promise.all([
    source === "github" ? Promise.resolve([]) : loadJira(settings, repos, deps, errors),
    source === "jira" ? Promise.resolve([]) : loadGithub(repos, deps, errors),
  ]);
  let issues = [...jira, ...github];
  if (issues.length === 0 && process.env.FLIGHTDECK_DEMO === "1") issues = demoIssues();
  if (query.repo) {
    const want = query.repo.toLowerCase();
    issues = issues.filter((i) => i.repos.some((r) => `${r.owner}/${r.name}`.toLowerCase() === want));
  }
  issues.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return { issues, errors };
}

export async function getIssue(id: string, deps: IssueDeps = {}): Promise<Issue | undefined> {
  const { issues } = await listIssues({}, deps);
  return issues.find((i) => i.id === id);
}

async function loadJira(
  settings: ReturnType<typeof getSettings>,
  repos: Repo[],
  deps: IssueDeps,
  errors: string[],
): Promise<Issue[]> {
  if (!settings.jiraSiteUrl || !settings.jiraEmail) return [];
  const token = await createSecretStore().get();
  if (!token) return [];
  try {
    const client = deps.jira ?? createJiraClient();
    const raw = await client.search({
      siteUrl: settings.jiraSiteUrl,
      email: settings.jiraEmail,
      token,
      jql: settings.jiraJql,
    });
    return raw.map((issue) => mapJira(issue, repos, settings.labelPrefix));
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Jira fetch failed");
    return [];
  }
}

async function loadGithub(
  repos: Repo[],
  deps: IssueDeps,
  errors: string[],
): Promise<Issue[]> {
  const client = deps.github ?? createGithubClient();
  const out: Issue[] = [];
  for (const repo of repos) {
    try {
      const raw = await client.listIssues(repo.owner, repo.name);
      for (const issue of raw) out.push(mapGithub(issue, repo));
    } catch (err) {
      errors.push(
        err instanceof Error ? err.message : `GitHub fetch failed for ${repo.owner}/${repo.name}`,
      );
    }
  }
  return out;
}

export function mapJira(
  issue: { key: string; title: string; body: string; url: string; labels: string[]; updatedAt: string },
  repos: Repo[],
  prefix: string,
): Issue {
  const parsed = parseRepoLabels(issue.labels, prefix);
  const registered = new Set(repos.map((r) => `${r.owner}/${r.name}`.toLowerCase()));
  const linked: LinkedRepo[] = parsed.map((p) => ({
    owner: p.owner,
    name: p.name,
    label: p.label,
    registered: registered.has(`${p.owner}/${p.name}`.toLowerCase()),
  }));
  return {
    id: `jira:${issue.key}`,
    source: "jira",
    key: issue.key,
    title: issue.title,
    body: issue.body,
    url: issue.url,
    stage: "new",
    repos: linked,
    repoWarning: repoLinkWarning(parsed),
    updatedAt: issue.updatedAt,
  };
}

function mapGithub(
  issue: { number: number; title: string; body: string; url: string; updatedAt: string },
  repo: Repo,
): Issue {
  return {
    id: `github:${repo.owner}/${repo.name}#${issue.number}`,
    source: "github",
    key: `${repo.owner}/${repo.name}#${issue.number}`,
    title: issue.title,
    body: issue.body,
    url: issue.url,
    stage: "new",
    repos: [{ owner: repo.owner, name: repo.name, registered: true }],
    repoWarning: "none",
    updatedAt: issue.updatedAt,
  };
}
