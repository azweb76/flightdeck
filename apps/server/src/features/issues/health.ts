import type { Issue } from "@flightdeck/shared";
import { cacheGet, cacheSet } from "../cache/index.ts";
import { nestPrs } from "../board-prs/nest.ts";
import { listBoardPrs } from "../board-prs/store.ts";
import { getSettings } from "../settings/index.ts";
import { overlayIssue } from "../runs/overlay.ts";
import { loadComments } from "./store.ts";

export type SourceOffline = { jira: boolean; github: boolean };

export type IssueListResult = {
  issues: Issue[];
  errors: string[];
  offline: boolean;
  offlineSources: SourceOffline;
  fromCache: boolean;
  syncedAt?: string;
};

export type SyncStatus = {
  offline: boolean;
  sources: SourceOffline;
  errors: string[];
  syncedAt?: string;
};

export function readSyncStatus(): SyncStatus {
  const empty: SyncStatus = { offline: false, sources: { jira: false, github: false }, errors: [] };
  const raw = cacheGet("issues:sync_status")?.body;
  if (!raw) return empty;
  try {
    const parsed = JSON.parse(raw) as Partial<SyncStatus>;
    return {
      offline: Boolean(parsed.offline),
      sources: {
        jira: Boolean(parsed.sources?.jira),
        github: Boolean(parsed.sources?.github),
      },
      errors: parsed.errors ?? [],
      syncedAt: parsed.syncedAt,
    };
  } catch {
    return empty;
  }
}

export function writeSyncStatus(status: SyncStatus): void {
  cacheSet("issues:sync_status", JSON.stringify(status));
}

export function wholeOffline(calledJira: boolean, calledGithub: boolean, sources: SourceOffline): boolean {
  if (!calledJira && !calledGithub) return false;
  return (!calledJira || sources.jira) && (!calledGithub || sources.github);
}

export function present(
  issues: Issue[],
  query: { repo?: string; source?: string },
  extra: {
    offline: boolean;
    offlineSources: SourceOffline;
    fromCache: boolean;
    errors: string[];
    syncedAt?: string;
  },
): IssueListResult {
  const withComments = issues.map((i) => ({ ...i, comments: i.comments ?? loadComments(i.id) }));
  const nested = nestPrs(withComments, listBoardPrs(), getSettings().boardLinkedIssues);
  let next = nested.map((i) => overlayIssue(i));
  if (query.source && query.source !== "all") {
    next = next.filter((i) => i.source === query.source);
  }
  if (query.repo) {
    const want = query.repo.toLowerCase();
    next = next.filter((i) => i.repos.some((r) => `${r.owner}/${r.name}`.toLowerCase() === want));
  }
  next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return { issues: next, ...extra };
}
