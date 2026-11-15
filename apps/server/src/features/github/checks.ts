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
  opts?: { fresh?: boolean },
): Promise<CommitChecks> {
  const key = CACHE_KEYS.githubChecks(owner, name, ref);
  if (opts?.fresh) getCache().invalidate(key);
  return getCache().get(key, () => loadChecks(token, fetchFn, owner, name, ref, key), TTL.githubChecks);
}

async function loadChecks(
  token: string,
  fetchFn: FetchFn,
  owner: string,
  name: string,
  ref: string,
  key: string,
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
    const data = summarize(ref, String(status.data.state ?? ""), runs.data.check_runs ?? []);
    return rememberEtag(key, etag, data);
  } catch (err) {
    if (isNotModified(err)) {
      const hit = etagHit<CommitChecks>(key);
      if (hit) return hit;
    }
    throw err;
  }
}

export function summarize(
  sha: string,
  combined: string,
  runs: { status?: string; conclusion?: string | null }[],
): CommitChecks {
  const pendingRun = runs.some((r) => r.status && r.status !== "completed");
  const failedRun = runs.some((r) => r.conclusion === "failure" || r.conclusion === "timed_out" || r.conclusion === "cancelled");
  if (pendingRun || combined === "pending") {
    return { state: "pending", sha, summary: "Checks are still running." };
  }
  if (failedRun || combined === "failure") {
    const names = runs.filter((r) => r.conclusion === "failure").length;
    return { state: "failing", sha, summary: names ? `${names} check(s) failed.` : "CI failed." };
  }
  if (runs.length === 0 && combined !== "success") {
    return { state: "passing", sha, summary: "No required checks." };
  }
  return { state: "passing", sha, summary: "All checks passed." };
}

function etagHeaders(key: string): Record<string, string> {
  const etag = rememberedEtag(key);
  return etag ? { "If-None-Match": etag } : {};
}
