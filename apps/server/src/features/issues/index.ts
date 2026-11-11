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
import {
  present,
  readSyncStatus,
  wholeOffline,
  writeSyncStatus,
  type IssueListResult,
  type SourceOffline,
} from "./health.ts";
import { loadComments, loadIssue, loadIssues, pruneIssues, replaceComments, upsertIssue } from "./store.ts";
import { cacheGet, cacheSet, hourCache } from "../cache/index.ts";
import { rememberedIssuePick, rememberedPicks } from "../discovery/index.ts";
import { publish } from "../events/index.ts";

export type { IssueListResult, SourceOffline } from "./health.ts";

export function rememberIssue(issue: Issue): void {
  upsertIssue(issue);
}

export class OfflineError extends Error {
  constructor() {
    super("offline");
    this.name = "OfflineError";
  }
}

export type IssueDeps = {
  github?: GithubClient;
  jira?: JiraClient;
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
    const last = readSyncStatus();
    void syncAssigned(query, deps, false)
      .then(() => publish("issues.updated"))
      .catch(() => {
        writeSyncStatus({
          offline: true,
          sources: { jira: true, github: true },
          errors: ["offline"],
          syncedAt: last.syncedAt,
        });
        publish("issues.updated");
      });
    return present(cached, query, {
      offline: last.offline,
      offlineSources: last.sources,
      fromCache: true,
      errors: last.errors,
      syncedAt: last.syncedAt ?? cacheGet("issues:last_sync")?.fetchedAt,
    });
  }
  try {
    return await syncAssigned(query, deps, refresh);
  } catch {
    const syncedAt = cacheGet("issues:last_sync")?.fetchedAt;
    writeSyncStatus({
      offline: true,
      sources: { jira: true, github: true },
      errors: ["offline"],
      syncedAt,
    });
    return present(cached, query, {
      offline: true,
      offlineSources: { jira: true, github: true },
      fromCache: true,
      errors: ["offline"],
      syncedAt,
    });
  }
}

export function isOffline(source?: string): boolean {
  const last = readSyncStatus();
  if (source === "jira") return last.sources.jira;
  if (source === "github") return last.sources.github;
  return last.offline;
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
    const syncedAt = new Date().toISOString();
    writeSyncStatus({ offline: false, sources: { jira: false, github: false }, errors: [], syncedAt });
    return present(demo, query, {
      offline: false,
      offlineSources: { jira: false, github: false },
      fromCache: false,
      errors: [],
    });
  }
  const settings = getSettings();
  const jiraErrors: string[] = [];
  const githubErrors: string[] = [];
  const source = query.source ?? "all";
  const visible = await hourCache("meta:repos", () => visibleRepos(deps), refreshMeta).catch(() => [] as VisibleRepo[]);
  const since = cacheGet("issues:last_sync")?.fetchedAt;
  const incremental = Boolean(since) && !refreshMeta;
  const [jira, github] = await Promise.all([
    source === "github" ? Promise.resolve([]) : loadJira(settings, visible, deps, jiraErrors, incremental ? since : undefined),
    source === "jira" ? Promise.resolve([]) : loadGithub(deps, githubErrors, incremental ? since : undefined),
  ]);
  const sources: SourceOffline = { jira: jiraErrors.length > 0, github: githubErrors.length > 0 };
  const errors = [...jiraErrors, ...githubErrors];
  const calledJira = source !== "github" && (jira.length > 0 || jiraErrors.length > 0);
  const calledGithub = source !== "jira";
  const offline = wholeOffline(calledJira, calledGithub, sources);
  const live = [...jira, ...github];
  if (live.length === 0 && process.env.FLIGHTDECK_DEMO === "1") {
    const demo = demoIssues();
    for (const issue of demo) upsertIssue(issue);
    const syncedAt = new Date().toISOString();
    writeSyncStatus({ offline, sources, errors, syncedAt });
    return present(demo, query, { offline, offlineSources: sources, fromCache: false, errors });
  }
  for (const issue of live) upsertIssue(issue, { assigned: true });
  // Incremental (since-filtered) lists are incomplete — never prune from them.
  if (!incremental) pruneIssues(live.map((i) => i.id));
  const syncedAt = new Date().toISOString();
  if (!offline) cacheSet("issues:last_sync", syncedAt);
  writeSyncStatus({ offline, sources, errors, syncedAt: offline ? since : syncedAt });
  return present(loadIssues(), query, {
    offline,
    offlineSources: sources,
    fromCache: false,
    errors,
    syncedAt: offline ? since : syncedAt,
  });
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
    const jql = assignedJql(settings.jiraJql, since);
    const raw = await client.search({
      siteUrl: settings.jiraSiteUrl,
      email: settings.jiraEmail,
      token,
      jql,
    });
    return raw.map((issue) =>
      mapJira(issue, visible, settings.labelPrefix, rememberedPicks(issue.key.split("-")[0] ?? "")),
    );
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

function assignedJql(settingsJql: string | undefined, since?: string): string {
  const base = settingsJql?.trim() || DEFAULT_JIRA_JQL;
  if (!since) return base;
  const stamp = since.slice(0, 19).replace("T", " ");
  return `(${base}) AND updated >= "${stamp}"`;
}

export function mapJira(
  issue: { key: string; title: string; body: string; url: string; labels: string[]; updatedAt: string },
  visible: VisibleRepo[],
  prefix: string,
  rememberedByLabel: Record<string, VisibleRepo> = {},
): Issue {
  const parsed = parseRepoLabels(issue.labels, prefix);
  const resolution = withIssuePick(
    `jira:${issue.key}`,
    resolveRepos(parsed, visible, rememberedByLabel),
  );
  const withLabel = (p: VisibleRepo): LinkedRepo => ({
    owner: p.owner,
    name: p.name,
    registered: true,
    label: parsed.find((x) => x.name.toLowerCase() === p.name.toLowerCase())?.label ?? `${p.owner}/${p.name}`,
  });
  return {
    id: `jira:${issue.key}`,
    source: "jira",
    key: issue.key,
    title: issue.title,
    body: issue.body,
    url: issue.url,
    stage: "new",
    repos: resolution.resolved.map(withLabel),
    repoWarning: resolution.warning,
    repoGuesses: resolution.guesses.map(withLabel),
    updatedAt: issue.updatedAt,
  };
}

function withIssuePick(
  issueId: string,
  resolution: ReturnType<typeof resolveRepos>,
): ReturnType<typeof resolveRepos> {
  const pick = rememberedIssuePick(issueId);
  if (!pick) return resolution;
  if (resolution.warning === "missing" || resolution.resolved.length === 0) {
    return { resolved: [pick], warning: "none", guesses: resolution.guesses };
  }
  return resolution;
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
