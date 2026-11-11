import {
  DEFAULT_JIRA_JQL,
  parseRepoLabels,
  resolveRepos,
  type Issue,
  type LinkedRepo,
  type VisibleRepo,
} from "@flightdeck/shared";
import { createGithubClient, type GithubClient } from "../github/index.ts";
import { createJiraClient, type JiraClient } from "../jira/index.ts";
import { createSecretStore } from "../secrets/index.ts";
import { getSettings } from "../settings/index.ts";
import { overlayIssue } from "../runs/overlay.ts";
import { demoIssues } from "./demo.ts";
import { loadComments, loadIssue, loadIssues, pruneIssues, replaceComments, upsertIssue } from "./store.ts";
import { cacheGet, cacheSet, hourCache } from "../cache/index.ts";
import { rememberedPick } from "../discovery/index.ts";

export function rememberIssue(issue: Issue): void {
  upsertIssue(issue);
}

export type IssueDeps = {
  github?: GithubClient;
  jira?: JiraClient;
};

export type IssueListResult = {
  issues: Issue[];
  errors: string[];
  offline: boolean;
  fromCache: boolean;
  syncedAt?: string;
};

export async function listIssues(
  query: { source?: "all" | "jira" | "github"; repo?: string; refresh?: string },
  deps: IssueDeps = {},
): Promise<IssueListResult> {
  const refresh = query.refresh === "1" || query.refresh === "true";
  const cached = loadIssues();
  if (refresh) {
    const { cacheClearPrefix } = await import("../cache/index.ts");
    cacheClearPrefix("meta:");
    cacheClearPrefix("issues:");
  }
  if (!refresh && cached.length > 0) {
    void syncAssigned(query, deps, false).catch(() => undefined);
    return present(cached, query, { offline: false, fromCache: true, errors: [], syncedAt: cacheGet("issues:last_sync")?.fetchedAt });
  }
  try {
    return await syncAssigned(query, deps, refresh);
  } catch {
    return present(cached, query, { offline: true, fromCache: true, errors: ["offline"], syncedAt: cacheGet("issues:last_sync")?.fetchedAt });
  }
}

export async function getIssue(id: string, deps: IssueDeps = {}): Promise<Issue | undefined> {
  const stored = loadIssue(id);
  if (stored) {
    void refreshIssue(stored, deps).catch(() => undefined);
    return overlayIssue({ ...stored, comments: loadComments(id) });
  }
  const { issues } = await listIssues({}, deps);
  return issues.find((i) => i.id === id);
}

export async function syncAssigned(
  query: { source?: "all" | "jira" | "github"; repo?: string } = {},
  deps: IssueDeps = {},
  refreshMeta = false,
): Promise<IssueListResult> {
  if (process.env.FLIGHTDECK_DEMO === "1" && !deps.github && !deps.jira) {
    const demo = demoIssues();
    for (const issue of demo) upsertIssue(issue);
    return present(demo, query, { offline: false, fromCache: false, errors: [] });
  }
  const settings = getSettings();
  const errors: string[] = [];
  const source = query.source ?? "all";
  let offline = false;
  const visible = await hourCache("meta:repos", () => visibleRepos(deps), refreshMeta).catch(() => [] as VisibleRepo[]);
  const since = cacheGet("issues:last_sync")?.fetchedAt;
  const [jira, github] = await Promise.all([
    source === "github" ? Promise.resolve([]) : loadJira(settings, visible, deps, errors, since),
    source === "jira" ? Promise.resolve([]) : loadGithub(deps, errors, since),
  ]);
  if (errors.length && jira.length === 0 && github.length === 0) offline = true;
  const live = [...jira, ...github];
  if (live.length === 0 && process.env.FLIGHTDECK_DEMO === "1") {
    const demo = demoIssues();
    for (const issue of demo) upsertIssue(issue);
    return present(demo, query, { offline: false, fromCache: false, errors });
  }
  for (const issue of live) upsertIssue(issue, { assigned: true });
  pruneIssues(live.map((i) => i.id));
  cacheSet("issues:last_sync", new Date().toISOString());
  return present(loadIssues(), query, { offline, fromCache: false, errors, syncedAt: new Date().toISOString() });
}

function present(
  issues: Issue[],
  query: { repo?: string },
  extra: { offline: boolean; fromCache: boolean; errors: string[]; syncedAt?: string },
): IssueListResult {
  let next = issues.map((i) => overlayIssue({ ...i, comments: i.comments ?? loadComments(i.id) }));
  if (query.repo) {
    const want = query.repo.toLowerCase();
    next = next.filter((i) => i.repos.some((r) => `${r.owner}/${r.name}`.toLowerCase() === want));
  }
  next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return { issues: next, ...extra };
}

async function visibleRepos(deps: IssueDeps): Promise<VisibleRepo[]> {
  const client = deps.github ?? createGithubClient();
  return client.listVisibleRepos();
}

async function loadJira(
  settings: ReturnType<typeof getSettings>,
  visible: VisibleRepo[],
  deps: IssueDeps,
  errors: string[],
  since?: string,
): Promise<Issue[]> {
  if (!settings.jiraSiteUrl || !settings.jiraEmail) return [];
  const token = (await createSecretStore().get()) ?? (deps.jira ? "test" : "");
  if (!token) return [];
  try {
    const client = deps.jira ?? createJiraClient();
    let jql = DEFAULT_JIRA_JQL;
    if (since) jql = `assignee = currentUser() AND statusCategory != Done AND updated >= "${since.slice(0, 19).replace("T", " ")}" ORDER BY updated DESC`;
    const raw = await client.search({
      siteUrl: settings.jiraSiteUrl,
      email: settings.jiraEmail,
      token,
      jql,
    });
    return raw.map((issue) => mapJira(issue, visible, settings.labelPrefix, rememberedPick(issue.key.split("-")[0] ?? "")));
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Jira fetch failed");
    return [];
  }
}

async function loadGithub(deps: IssueDeps, errors: string[], since?: string): Promise<Issue[]> {
  const client = deps.github ?? createGithubClient();
  try {
    const raw = await client.listAssignedIssues(since);
    return raw.map((issue) => mapGithub(issue));
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "GitHub assigned-issue search failed");
    return [];
  }
}

export function mapJira(
  issue: { key: string; title: string; body: string; url: string; labels: string[]; updatedAt: string },
  visible: VisibleRepo[],
  prefix: string,
  remembered?: VisibleRepo,
): Issue {
  const parsed = parseRepoLabels(issue.labels, prefix);
  const resolution = resolveRepos(parsed, visible, remembered);
  const linked: LinkedRepo[] = resolution.resolved.map((p) => ({
    owner: p.owner,
    name: p.name,
    registered: true,
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
    repoWarning: resolution.warning,
    repoGuesses: resolution.guesses.map((g) => ({ ...g, registered: true })),
    updatedAt: issue.updatedAt,
  };
}

function mapGithub(issue: {
  number: number;
  title: string;
  body: string;
  url: string;
  updatedAt: string;
  owner: string;
  name: string;
}): Issue {
  return {
    id: `github:${issue.owner}/${issue.name}#${issue.number}`,
    source: "github",
    key: `${issue.owner}/${issue.name}#${issue.number}`,
    title: issue.title,
    body: issue.body,
    url: issue.url,
    stage: "new",
    repos: [{ owner: issue.owner, name: issue.name, registered: true }],
    repoWarning: "none",
    updatedAt: issue.updatedAt,
  };
}

async function refreshIssue(issue: Issue, deps: IssueDeps): Promise<void> {
  if (issue.source === "github" && issue.repos[0]) {
    const gh = deps.github ?? createGithubClient();
    const etag = cacheGet(`gh:comments:${issue.id}`)?.etag;
    const path = `repos/${issue.repos[0].owner}/${issue.repos[0].name}/issues/${issue.key.split("#")[1]}/comments`;
    const res = await gh.getJson(path, etag);
    if (res.status === 304) return;
    cacheSet(`gh:comments:${issue.id}`, res.body, res.etag);
    const parsed = JSON.parse(res.body || "[]") as { id?: number; user?: { login?: string }; body?: string; created_at?: string }[];
    replaceComments(
      issue.id,
      parsed.map((c) => ({
        id: String(c.id ?? ""),
        author: c.user?.login ?? "",
        body: c.body ?? "",
        createdAt: c.created_at ?? "",
      })),
    );
  }
}
