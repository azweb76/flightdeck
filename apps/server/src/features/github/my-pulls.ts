import { prNeedsYou, type OwnPr, type PrReviewState } from "@flightdeck/shared";
import { CACHE_KEYS, getCache, TTL } from "../cache/index.ts";
import { createOctokit, githubCall, type FetchFn } from "./octokit.ts";
import { commitChecks } from "./checks.ts";
import { etagHit, isNotModified, rememberedEtag, rememberEtag } from "./etag.ts";
import { listAuthoredPullsGql } from "./my-pulls-gql.ts";
import { reduceReviews } from "./reviews.ts";

type SearchItem = {
  number: number;
  title: string;
  html_url: string;
  draft?: boolean;
  updated_at?: string;
  repository_url?: string;
  pull_request?: { url?: string };
};

export async function listAuthoredPulls(token: string, fetchFn: FetchFn): Promise<OwnPr[]> {
  const key = CACHE_KEYS.githubPulls;
  return getCache().get(key, () => loadPulls(token, fetchFn, key), TTL.githubPulls);
}

async function loadPulls(token: string, fetchFn: FetchFn, key: string): Promise<OwnPr[]> {
  try {
    return await listAuthoredPullsGql(token, fetchFn);
  } catch {
    return loadPullsRest(token, fetchFn, key);
  }
}

async function loadPullsRest(token: string, fetchFn: FetchFn, key: string): Promise<OwnPr[]> {
  const octokit = createOctokit(token, fetchFn);
  const headers = rememberedEtag(key) ? { "If-None-Match": rememberedEtag(key)! } : {};
  try {
    const res = await githubCall(() =>
      octokit.rest.search.issuesAndPullRequests({
        q: "is:pr is:open author:@me archived:false",
        per_page: 50,
        headers,
      }),
    );
    const items = (res.data.items ?? []) as SearchItem[];
    const etag = String(res.headers.etag ?? "");
    const prs = await Promise.all(items.map((item) => toOwnPr(token, fetchFn, item)));
    return rememberEtag(key, etag, prs);
  } catch (err) {
    if (isNotModified(err)) {
      const hit = etagHit<OwnPr[]>(key);
      if (hit) return hit;
    }
    throw err;
  }
}

async function toOwnPr(token: string, fetchFn: FetchFn, item: SearchItem): Promise<OwnPr> {
  const repoSlug = repoFrom(item);
  const [owner, name] = repoSlug.split("/");
  const number = item.number;
  const id = `github:${repoSlug}#${number}`;
  let review: PrReviewState = "none";
  let ci: OwnPr["ci"] = "unknown";
  if (owner && name) {
    review = await reviewState(token, fetchFn, owner, name, number);
    try {
      const checks = await commitChecks(token, fetchFn, owner, name, `refs/pull/${number}/head`);
      ci = checks.state;
    } catch {
      ci = "unknown";
    }
  }
  return {
    id,
    repoSlug,
    number,
    title: item.title,
    url: item.html_url,
    draft: Boolean(item.draft),
    ci,
    review,
    needsYou: prNeedsYou({ review, ci, ciRound: 0 }),
    ciRound: 0,
    updatedAt: item.updated_at ?? new Date().toISOString(),
  };
}

async function reviewState(
  token: string,
  fetchFn: FetchFn,
  owner: string,
  name: string,
  number: number,
): Promise<PrReviewState> {
  const octokit = createOctokit(token, fetchFn);
  const res = await githubCall(() => octokit.rest.pulls.listReviews({ owner, repo: name, pull_number: number, per_page: 100 }));
  return reduceReviews(res.data ?? []);
}

function repoFrom(item: SearchItem): string {
  const fromRepo = item.repository_url?.match(/repos\/([^/]+\/[^/]+)$/)?.[1];
  if (fromRepo) return fromRepo;
  const fromHtml = item.html_url.match(/github\.com\/([^/]+\/[^/]+)\/pull\//)?.[1];
  return fromHtml ?? "";
}
