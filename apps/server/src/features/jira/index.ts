import { markdownToAdf } from "@flightdeck/shared";
import { authHeaders, throwIfJiraFailed } from "./http.ts";
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
  return {
    test: (siteUrl, email, token) => testJira(fetchFn, siteUrl, email, token),
    search: (opts) => searchJira(fetchFn, opts),
    createIssue: (opts) => jiraCreate(fetchFn, opts),
    updateIssue: (opts) => jiraUpdate(fetchFn, opts),
  };
}

async function testJira(fetchFn: FetchFn, siteUrl: string, email: string, token: string) {
  const base = siteUrl.replace(/\/$/, "");
  const res = await fetchFn(`${base}/rest/api/3/myself`, { headers: authHeaders(email, token) });
  if (!res.ok) {
    await throwIfJiraFailed(res, "Jira login failed");
  }
  const me = (await res.json()) as { displayName?: string };
  return { ok: true, detail: me.displayName ? `Connected as ${me.displayName}` : "Connected" };
}

async function jiraCreate(
  fetchFn: FetchFn,
  opts: { siteUrl: string; email: string; token: string; projectKey: string; title: string; body: string },
) {
  const base = opts.siteUrl.replace(/\/$/, "");
  const res = await fetchFn(`${base}/rest/api/3/issue`, {
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
  });
  await throwIfJiraFailed(res, "Jira create failed");
  const data = (await res.json()) as { key: string };
  return { key: data.key, url: `${base}/browse/${data.key}` };
}

async function jiraUpdate(
  fetchFn: FetchFn,
  opts: { siteUrl: string; email: string; token: string; key: string; title: string; body: string },
) {
  const base = opts.siteUrl.replace(/\/$/, "");
  const res = await fetchFn(`${base}/rest/api/3/issue/${opts.key}`, {
    method: "PUT",
    headers: { ...authHeaders(opts.email, opts.token), "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: { summary: opts.title, description: { ...markdownToAdf(opts.body), version: 1 } },
    }),
  });
  await throwIfJiraFailed(res, "Jira update failed");
}
