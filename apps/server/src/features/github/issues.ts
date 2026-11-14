import { CACHE_KEYS, getCache } from "../cache/index.ts";
import { createOctokit, githubCall, type FetchFn } from "./octokit.ts";
import { headerOf } from "./scopes.ts";
import type { GhIssue } from "./types.ts";

const SEARCH = "is:issue is:open assignee:@me";

export async function listAssigned(token: string, fetchFn: FetchFn): Promise<GhIssue[]> {
  const octokit = createOctokit(token, fetchFn);
  const items = await githubCall(async () => {
    const rows: SearchHit[] = [];
    for (let page = 1; page <= 10; page++) {
      const res = await octokit.rest.search.issuesAndPullRequests({ q: SEARCH, per_page: 100, page });
      rows.push(...res.data.items);
      if (!/rel="next"/.test(headerOf(res.headers, "link") ?? "")) break;
    }
    return rows;
  });
  return items.map(toIssue);
}

export async function createIssue(
  token: string,
  fetchFn: FetchFn,
  owner: string,
  name: string,
  title: string,
  body: string,
): Promise<{ number: number; url: string }> {
  const octokit = createOctokit(token, fetchFn);
  const res = await githubCall(() => octokit.rest.issues.create({ owner, repo: name, title, body }));
  getCache().invalidate(CACHE_KEYS.githubIssues);
  return { number: res.data.number, url: res.data.html_url };
}

export async function updateIssue(
  token: string,
  fetchFn: FetchFn,
  owner: string,
  name: string,
  number: number,
  title: string,
  body: string,
): Promise<void> {
  const octokit = createOctokit(token, fetchFn);
  await githubCall(() => octokit.rest.issues.update({ owner, repo: name, issue_number: number, title, body }));
  getCache().invalidate(CACHE_KEYS.githubIssues);
}

type SearchHit = {
  number: number;
  title: string;
  body?: string | null;
  html_url: string;
  updated_at: string;
  repository_url: string;
};

function toIssue(row: SearchHit): GhIssue {
  const slug = row.repository_url.replace("https://api.github.com/repos/", "");
  const [owner, name] = slug.split("/");
  return {
    id: `github:${owner}/${name}#${row.number}`,
    number: row.number,
    title: row.title,
    body: row.body ?? "",
    url: row.html_url,
    updatedAt: row.updated_at,
    owner: owner ?? "",
    name: name ?? "",
  };
}
