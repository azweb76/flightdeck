import { DEFAULT_JIRA_JQL, type Issue, type VisibleRepo } from "@flightdeck/shared";
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
import { loadComments, loadIssue, loadIssues, replaceComments, upsertIssue } from "./store.ts";
import { applyBoardPrs, syncBoardPrs } from "../board-prs/index.ts";
import { countsFrom, writePrDiag } from "../board-prs/diag.ts";
import { nestPrs } from "../board-prs/nest.ts";
import { listBoardPrs } from "../board-prs/store.ts";
import { seedBoardPrs } from "../demo/seed-prs.ts";
import { listCatalog } from "../catalog/index.ts";
import { cacheGet, cacheSet, hourCache } from "../cache/index.ts";
import { rememberedPicks } from "../discovery/index.ts";
import { publish } from "../events/index.ts";
import { mapGithub, mapJira } from "./map.ts";

export { mapJira } from "./map.ts";

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

let syncing: Promise<IssueListResult> | undefined;

export async function listIssues(
  query: { source?: "all" | "jira" | "github"; repo?: string; refresh?: string },
  deps: IssueDeps = {},
): Promise<IssueListResult> {
  const refresh = query.refresh === "1" || query.refresh === "true";
  if (refresh) {
    const { cacheClearPrefix } = await import("../cache/index.ts");
    cacheClearPrefix("meta:");
    cacheClearPrefix("issues:");
    try {
      return await syncAssigned(query, deps, true);
    } catch {
      return cachedList(query, true);
    }
  }
  return cachedList(query, false);
}

function cachedList(
  query: { source?: "all" | "jira" | "github"; repo?: string },
  failedLive: boolean,
): IssueListResult {
  const last = readSyncStatus();
  const syncedAt = last.syncedAt ?? cacheGet("issues:last_sync")?.fetchedAt;
  return present(loadIssues(), query, {
    offline: failedLive || last.offline,
    offlineSources: failedLive ? { jira: true, github: true } : last.sources,
    fromCache: true,
    errors: failedLive ? ["offline"] : last.errors,
    syncedAt,
  });
}

/** Background SWR. Coalesces overlapping live gh/Jira syncs. */
export function scheduleAssignedSync(
  query: { source?: "all" | "jira" | "github"; repo?: string } = {},
  deps: IssueDeps = {},
): Promise<IssueListResult> {
  if (syncing) return syncing;
  syncing = syncAssigned(query, deps, false)
    .then((result) => {
      publish("issues.updated");
      return result;
    })
    .catch(() => {
      const last = readSyncStatus();
      writeSyncStatus({
        offline: true,
        sources: { jira: true, github: true },
        errors: ["offline"],
        syncedAt: last.syncedAt,
      });
      publish("issues.updated");
      return cachedList(query, true);
    })
    .finally(() => {
      syncing = undefined;
    });
  return syncing;
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
    return overlayOne(stored);
  }
  await syncAssigned({}, deps, false).catch(() => undefined);
  const next = loadIssue(id);
  return next ? overlayOne(next) : undefined;
}

function overlayOne(issue: Issue): Issue {
  const nested = nestPrs([{ ...issue, comments: loadComments(issue.id) }], listBoardPrs(), getSettings().boardLinkedIssues);
  return overlayIssue(nested[0] ?? issue);
}

export async function syncAssigned(
  query: { source?: "all" | "jira" | "github"; repo?: string } = {},
  deps: IssueDeps = {},
  refreshMeta = false,
): Promise<IssueListResult> {
  if (process.env.FLIGHTDECK_DEMO === "1" && !deps.github && !deps.jira) {
    const demo = demoIssues();
    for (const issue of demo) upsertIssue(issue);
    seedBoardPrs();
    applyBoardPrs(loadIssues(), listBoardPrs(), true, true);
    const demoPrs = listBoardPrs();
    writePrDiag({ syncedAt: new Date().toISOString(), viewerLogin: "demo", query: "demo seed", ...countsFrom(demoPrs) });
    const syncedAt = new Date().toISOString();
    writeSyncStatus({ offline: false, sources: { jira: false, github: false }, errors: [], syncedAt });
    return present(loadIssues(), query, {
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
    seedBoardPrs();
    applyBoardPrs(loadIssues(), listBoardPrs(), true, true);
    const demoPrs = listBoardPrs();
    writePrDiag({ syncedAt: new Date().toISOString(), viewerLogin: "demo", query: "demo seed", ...countsFrom(demoPrs) });
    const syncedAt = new Date().toISOString();
    writeSyncStatus({ offline, sources, errors, syncedAt });
    return present(loadIssues(), query, { offline, offlineSources: sources, fromCache: false, errors });
  }
  for (const issue of live) upsertIssue(issue, { assigned: true });
  const projectKeys = [...new Set(live.filter((i) => i.source === "jira").map((i) => i.key.split("-")[0] ?? ""))].filter(Boolean);
  const prs = await syncBoardPrs(deps, { projectKeys });
  const assignedComplete = !incremental && jiraErrors.length === 0 && githubErrors.length === 0;
  applyBoardPrs(live, prs.prs, prs.complete, assignedComplete);
  const syncedAt = new Date().toISOString();
  if (!offline && prs.ok) cacheSet("issues:last_sync", syncedAt);
  writeSyncStatus({
    offline,
    sources,
    errors: [...errors, ...prs.errors],
    syncedAt: offline ? since : syncedAt,
  });
  return present(loadIssues(), query, {
    offline,
    offlineSources: sources,
    fromCache: false,
    errors: [...errors, ...prs.errors],
    syncedAt: offline ? since : syncedAt,
  });
}

async function visibleRepos(deps: IssueDeps): Promise<VisibleRepo[]> {
  const cached = listCatalog();
  if (cached.length > 0) return cached.map((r) => ({ owner: r.owner, name: r.name }));
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
