import { CACHE_KEYS, getCache, TTL } from "../cache/index.ts";
import { createOctokit, githubCall, type FetchFn } from "./octokit.ts";
import { etagHit, isNotModified, rememberedEtag, rememberEtag } from "./etag.ts";
import { getPullState } from "./prs.ts";

export type ReviewRequest = {
  id: string;
  repoSlug: string;
  number: number;
  title: string;
  url: string;
  author: string;
  headSha: string;
  updatedAt: string;
};

export async function listReviewRequests(token: string, fetchFn: FetchFn): Promise<ReviewRequest[]> {
  const key = CACHE_KEYS.githubReviewRequests;
  return getCache().get(key, () => loadRequests(token, fetchFn, key), TTL.githubReviewRequests);
}

async function loadRequests(token: string, fetchFn: FetchFn, key: string): Promise<ReviewRequest[]> {
  const octokit = createOctokit(token, fetchFn);
  const etag = rememberedEtag(key);
  const headers = etag ? { "If-None-Match": etag } : {};
  try {
    const res = await githubCall(() =>
      octokit.rest.search.issuesAndPullRequests({
        q: "is:pr is:open review-requested:@me archived:false",
        per_page: 50,
        headers,
      }),
    );
    const items = (res.data.items ?? []) as SearchItem[];
    const prs = await Promise.all(items.map((item) => toRequest(token, fetchFn, item)));
    return rememberEtag(key, String(res.headers.etag ?? ""), prs);
  } catch (err) {
    if (isNotModified(err)) {
      const hit = etagHit<ReviewRequest[]>(key);
      if (hit) return hit;
    }
    throw err;
  }
}

type SearchItem = {
  number: number;
  title: string;
  html_url: string;
  updated_at?: string;
  user?: { login?: string };
  repository_url?: string;
  pull_request?: { url?: string };
};

async function toRequest(token: string, fetchFn: FetchFn, item: SearchItem): Promise<ReviewRequest> {
  const repoSlug = repoFrom(item);
  const [owner, name] = repoSlug.split("/");
  let headSha = "";
  if (owner && name) {
    const pr = await getPullState(token, fetchFn, owner, name, item.number);
    headSha = pr.sha ?? "";
  }
  return {
    id: `github:${repoSlug}#${item.number}`,
    repoSlug,
    number: item.number,
    title: item.title,
    url: item.html_url,
    author: item.user?.login ?? "",
    headSha,
    updatedAt: item.updated_at ?? new Date().toISOString(),
  };
}

function repoFrom(item: SearchItem): string {
  const fromRepo = item.repository_url?.replace(/.*\/repos\//, "");
  if (fromRepo) return fromRepo;
  const m = item.html_url.match(/github\.com\/([^/]+\/[^/]+)\//);
  return m?.[1] ?? "";
}
