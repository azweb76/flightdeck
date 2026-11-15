import { CACHE_KEYS, getCache, TTL } from "../cache/index.ts";
import { createOctokit, githubCall, type FetchFn } from "./octokit.ts";
import { etagHit, isNotModified, rememberedEtag, rememberEtag } from "./etag.ts";

export type PullFile = { filename: string; patch?: string; status?: string };

export async function listPullFiles(
  token: string,
  fetchFn: FetchFn,
  owner: string,
  name: string,
  number: number,
): Promise<PullFile[]> {
  const key = CACHE_KEYS.githubPullFiles(owner, name, number);
  return getCache().get(key, () => loadFiles(token, fetchFn, owner, name, number, key), TTL.githubPull);
}

async function loadFiles(
  token: string,
  fetchFn: FetchFn,
  owner: string,
  name: string,
  number: number,
  key: string,
): Promise<PullFile[]> {
  const octokit = createOctokit(token, fetchFn);
  const etag = rememberedEtag(key);
  const headers = etag ? { "If-None-Match": etag } : {};
  try {
    const res = await githubCall(() =>
      octokit.rest.pulls.listFiles({ owner, repo: name, pull_number: number, per_page: 100, headers }),
    );
    const files = (res.data ?? []).map((f) => ({
      filename: String(f.filename ?? ""),
      patch: f.patch,
      status: f.status,
    }));
    return rememberEtag(key, String(res.headers.etag ?? ""), files);
  } catch (err) {
    if (isNotModified(err)) {
      const hit = etagHit<PullFile[]>(key);
      if (hit) return hit;
    }
    throw err;
  }
}
