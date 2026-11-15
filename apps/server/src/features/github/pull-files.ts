import { CACHE_KEYS, getCache, TTL } from "../cache/index.ts";
import { createOctokit, githubCall, type FetchFn } from "./octokit.ts";
import { etagHit, isNotModified, rememberedEtag, rememberEtag } from "./etag.ts";

export type PullFile = { filename: string; patch?: string; status?: string; previous_filename?: string };

const PAGE = 100;
const MAX_PAGES = 30;

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
  const files: PullFile[] = [];
  let pageEtag = "";
  for (let page = 1; page <= MAX_PAGES; page++) {
    const headers = page === 1 && etag ? { "If-None-Match": etag } : {};
    let res: Awaited<ReturnType<typeof octokit.rest.pulls.listFiles>>;
    try {
      res = await githubCall(() =>
        octokit.rest.pulls.listFiles({ owner, repo: name, pull_number: number, per_page: PAGE, page, headers }),
      );
    } catch (err) {
      if (page === 1 && isNotModified(err)) {
        const hit = etagHit<PullFile[]>(key);
        if (hit) return hit;
      }
      throw err;
    }
    if (page === 1) pageEtag = String(res.headers.etag ?? "");
    const rows = res.data ?? [];
    for (const f of rows) {
      files.push({
        filename: String(f.filename ?? ""),
        patch: f.patch,
        status: f.status,
        previous_filename: f.previous_filename,
      });
    }
    if (rows.length < PAGE) break;
  }
  return rememberEtag(key, pageEtag, files);
}
