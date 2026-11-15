import { CACHE_KEYS, getCache, TTL } from "../cache/index.ts";
import { createOctokit, githubCall, type FetchFn } from "./octokit.ts";
import { etagHit, isNotModified, rememberedEtag, rememberEtag } from "./etag.ts";
import type { PrCiState } from "@flightdeck/shared";

export type CommitChecks = { state: PrCiState; sha: string; summary: string };

export async function commitChecks(
  token: string,
  fetchFn: FetchFn,
  owner: string,
  name: string,
  ref: string,
  opts?: { fresh?: boolean; sinceMs?: number },
): Promise<CommitChecks> {
  const key = CACHE_KEYS.githubChecks(owner, name, ref);
  if (opts?.fresh) getCache().invalidate(key);
  return getCache().get(key, () => loadChecks(token, fetchFn, owner, name, ref, key, opts?.sinceMs), TTL.githubChecks);
}

async function loadChecks(
  token: string,
  fetchFn: FetchFn,
  owner: string,
  name: string,
  ref: string,
  key: string,
  sinceMs?: number,
): Promise<CommitChecks> {
  const octokit = createOctokit(token, fetchFn);
  const headers = etagHeaders(key);
  try {
    const [status, runs] = await githubCall(() =>
      Promise.all([
        octokit.rest.repos.getCombinedStatusForRef({ owner, repo: name, ref, headers }),
        octokit.rest.checks.listForRef({ owner, repo: name, ref, per_page: 100, headers }),
      ]),
    );
    const etag = String(status.headers.etag ?? runs.headers.etag ?? "");
    const statuses = (status.data.statuses ?? []) as { state?: string }[];
    const data = summarize(ref, String(status.data.state ?? ""), runs.data.check_runs ?? [], statuses, { sinceMs });
    return rememberEtag(key, etag, data);
  } catch (err) {
    if (isNotModified(err)) {
      const hit = etagHit<CommitChecks>(key);
      if (hit) return hit;
    }
    throw err;
  }
}

export type CheckRun = { status?: string; conclusion?: string | null };
export type CommitStatus = { state?: string };
export type SummarizeOpts = { sinceMs?: number; now?: number };

/** Wait this long after a PR open or push before treating empty checks as "no CI". */
export const CHECKS_GRACE_MS = 45_000;

export function graceSinceMs(
  change: { ciPushedAt?: string; updatedAt: string },
  pr?: { createdAt?: string; updatedAt?: string; committedAt?: string },
): number | undefined {
  const pushed = Date.parse(change.ciPushedAt ?? "");
  if (!Number.isNaN(pushed)) return pushed;
  const head = Date.parse(pr?.committedAt ?? "");
  if (!Number.isNaN(head)) return head;
  const created = Date.parse(pr?.createdAt ?? "");
  const updated = Date.parse(pr?.updatedAt ?? "");
  const known = [created, updated].filter((n) => !Number.isNaN(n));
  if (known.length) return Math.max(...known);
  const fallback = Date.parse(change.updatedAt);
  return Number.isNaN(fallback) ? undefined : fallback;
}

export function summarize(
  sha: string,
  combined: string,
  runs: CheckRun[],
  statuses: CommitStatus[] = [],
  opts: SummarizeOpts = {},
): CommitChecks {
  const hasRuns = runs.length > 0;
  const hasStatuses = statuses.length > 0;
  if (hasRuns && runs.some((r) => r.status && r.status !== "completed")) {
    return { state: "pending", sha, summary: "Checks are still running." };
  }
  if (runs.some((r) => r.conclusion === "action_required")) {
    return { state: "action_required", sha, summary: "A check needs a GitHub action." };
  }
  const failedRuns = runs.filter((r) => r.conclusion === "failure" || r.conclusion === "timed_out");
  if (failedRuns.length) {
    return { state: "failing", sha, summary: `${failedRuns.length} check(s) failed.` };
  }
  if (hasStatuses) {
    if (combined === "pending" || statuses.some((s) => s.state === "pending")) {
      return { state: "pending", sha, summary: "Checks are still running." };
    }
    if (combined === "failure" || statuses.some((s) => s.state === "failure" || s.state === "error")) {
      return { state: "failing", sha, summary: "CI failed." };
    }
  } else if (!hasRuns) {
    return emptyChecks(sha, combined, opts);
  }
  if (!hasStatuses && runs.every((r) => r.conclusion === "cancelled" || r.conclusion === "skipped")) {
    return emptyChecks(sha, combined, opts);
  }
  return { state: "passing", sha, summary: "All checks passed." };
}

function emptyChecks(sha: string, combined: string, opts: SummarizeOpts): CommitChecks {
  if (combined === "pending" || combined === "") {
    return { state: "pending", sha, summary: "Checks have not started yet." };
  }
  if (combined === "failure" || combined === "error") {
    return { state: "failing", sha, summary: "CI failed." };
  }
  const now = opts.now ?? Date.now();
  if (opts.sinceMs != null && now - opts.sinceMs < CHECKS_GRACE_MS) {
    return { state: "pending", sha, summary: "Waiting for GitHub checks to register." };
  }
  if (combined === "success" || combined === "neutral") {
    return { state: "passing", sha, summary: "No required checks." };
  }
  return { state: "pending", sha, summary: "Checks have not started yet." };
}

function etagHeaders(key: string): Record<string, string> {
  const etag = rememberedEtag(key);
  return etag ? { "If-None-Match": etag } : {};
}
