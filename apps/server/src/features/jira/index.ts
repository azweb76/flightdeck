import { markdownToAdf } from "@flightdeck/shared";
import { CACHE_KEYS, getCache, TTL } from "../cache/index.ts";
import { authHeaders, jiraFetch } from "./http.ts";
import { searchJira } from "./search.ts";
import type { JiraIssue } from "./types.ts";

export { jiraSearchJql } from "./jql.ts";
export { parseJiraErrorBody } from "./http.ts";
export type { JiraIssue } from "./types.ts";

export type JiraClient = {
  test(siteUrl: string, email: string, token: string): Promise<{ ok: boolean; detail: string }>;
  search(opts: { siteUrl: string; email: string; token: string; jql: string }): Promise<JiraIssue[]>;
  createIssue(opts: {
    siteUrl: string;
    email: string;
    token: string;
    projectKey: string;
    title: string;
    body: string;
  }): Promise<{ key: string; url: string }>;
  updateIssue(opts: {
    siteUrl: string;
    email: string;
    token: string;
    key: string;
    title: string;
    body: string;
  }): Promise<void>;
};

type FetchFn = typeof fetch;

export function createJiraClient(fetchFn: FetchFn = fetch): JiraClient {
  const cache = getCache();
  return {
    test: (siteUrl, email, token) =>
      cache.get(CACHE_KEYS.jiraTest(siteUrl, email), () => testJira(fetchFn, siteUrl, email, token), TTL.jiraConnect),
    search: (opts) =>
      cache.get(
        CACHE_KEYS.jiraSearch(opts.siteUrl, opts.email, opts.jql),
        () => searchJira(fetchFn, opts),
        TTL.jiraSearch,
      ),
    createIssue: (opts) => jiraCreate(fetchFn, opts),
    updateIssue: (opts) => jiraUpdate(fetchFn, opts),
  };
}

async function testJira(fetchFn: FetchFn, siteUrl: string, email: string, token: string) {
  const base = siteUrl.replace(/\/$/, "");
  const res = await jiraFetch(
    fetchFn,
    `${base}/rest/api/3/myself`,
    { headers: authHeaders(email, token) },
    "Jira login failed",
  );
  const me = (await res.json()) as { displayName?: string };
  return { ok: true, detail: me.displayName ? `Connected as ${me.displayName}` : "Connected" };
}

async function jiraCreate(
  fetchFn: FetchFn,
  opts: { siteUrl: string; email: string; token: string; projectKey: string; title: string; body: string },
) {
  const base = opts.siteUrl.replace(/\/$/, "");
  const res = await jiraFetch(
    fetchFn,
    `${base}/rest/api/3/issue`,
    {
      method: "POST",
      headers: { ...authHeaders(opts.email, opts.token), "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          project: { key: opts.projectKey },
          summary: opts.title,
          issuetype: { name: "Task" },
          description: { ...markdownToAdf(opts.body), version: 1 },
        },
      }),
    },
    "Jira create failed",
  );
  const data = (await res.json()) as { key: string };
  getCache().invalidate(CACHE_KEYS.jiraAll);
  return { key: data.key, url: `${base}/browse/${data.key}` };
}

async function jiraUpdate(
  fetchFn: FetchFn,
  opts: { siteUrl: string; email: string; token: string; key: string; title: string; body: string },
) {
  const base = opts.siteUrl.replace(/\/$/, "");
  await jiraFetch(
    fetchFn,
    `${base}/rest/api/3/issue/${opts.key}`,
    {
      method: "PUT",
      headers: { ...authHeaders(opts.email, opts.token), "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: { summary: opts.title, description: { ...markdownToAdf(opts.body), version: 1 } },
      }),
    },
    "Jira update failed",
  );
  getCache().invalidate(CACHE_KEYS.jiraAll);
}
