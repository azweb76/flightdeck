import { CACHE_KEYS, getCache, TTL } from "../cache/index.ts";
import { createOctokit, githubCall, type FetchFn } from "./octokit.ts";
import { etagHit, isNotModified, rememberedEtag, rememberEtag } from "./etag.ts";

export type PullState = {
  state: string;
  merged: boolean;
  createdAt?: string;
  updatedAt?: string;
  committedAt?: string;
  sha?: string;
};

export type PullStateOpts = { headCommit?: boolean };

export async function createDraftPr(
  token: string,
  fetchFn: FetchFn,
  owner: string,
  name: string,
  input: { title: string; body: string; head: string; base: string },
): Promise<{ number: number; url: string }> {
  const octokit = createOctokit(token, fetchFn);
  const res = await githubCall(() =>
    octokit.rest.pulls.create({
      owner,
      repo: name,
      title: input.title,
      body: input.body,
      head: input.head,
      base: input.base,
      draft: true,
    }),
  );
  return { number: res.data.number, url: res.data.html_url };
}

export async function getPullState(
  token: string,
  fetchFn: FetchFn,
  owner: string,
  name: string,
  number: number,
  opts?: PullStateOpts,
): Promise<PullState> {
  const key = CACHE_KEYS.githubPull(owner, name, number);
  const pr = await getCache().get(key, () => loadPull(token, fetchFn, owner, name, number, key), TTL.githubPull);
  if (!opts?.headCommit || pr.committedAt || !pr.sha) return pr;
  pr.committedAt = await headCommittedAt(createOctokit(token, fetchFn), owner, name, pr.sha);
  return pr;
}

async function loadPull(
  token: string,
  fetchFn: FetchFn,
  owner: string,
  name: string,
  number: number,
  key: string,
): Promise<PullState> {
  const octokit = createOctokit(token, fetchFn);
  const etag = rememberedEtag(key);
  const headers = etag ? { "If-None-Match": etag } : {};
  try {
    const res = await githubCall(() => octokit.rest.pulls.get({ owner, repo: name, pull_number: number, headers }));
    const sha = String(res.data.head?.sha ?? "");
    const data: PullState = {
      state: String(res.data.state ?? "open"),
      merged: Boolean(res.data.merged),
      createdAt: res.data.created_at,
      updatedAt: res.data.updated_at,
      sha: sha || undefined,
    };
    return rememberEtag(key, String(res.headers.etag ?? ""), data);
  } catch (err) {
    if (isNotModified(err)) {
      const hit = etagHit<PullState>(key);
      if (hit) return hit;
    }
    throw err;
  }
}

async function headCommittedAt(
  octokit: ReturnType<typeof createOctokit>,
  owner: string,
  name: string,
  sha: string,
): Promise<string | undefined> {
  const commit = await githubCall(() => octokit.rest.repos.getCommit({ owner, repo: name, ref: sha }));
  return commit.data.commit.committer?.date ?? commit.data.commit.author?.date;
}

export async function commentIssue(
  token: string,
  fetchFn: FetchFn,
  owner: string,
  name: string,
  number: number,
  body: string,
): Promise<void> {
  const octokit = createOctokit(token, fetchFn);
  await githubCall(() => octokit.rest.issues.createComment({ owner, repo: name, issue_number: number, body }));
}
