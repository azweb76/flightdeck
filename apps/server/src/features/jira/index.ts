import { adfToMarkdown, markdownToAdf } from "@flightdeck/shared";
import { authHeaders, jiraHttpError, throwIfJiraFailed } from "./http.ts";
import { searchJira } from "./search.ts";
import type { JiraIssue } from "./types.ts";

export { jiraSearchJql } from "./jql.ts";
export { parseJiraErrorBody } from "./http.ts";
export type { JiraIssue } from "./types.ts";

export type JiraClient = {
  test(siteUrl: string, email: string, token: string): Promise<{ ok: boolean; detail: string }>;
  search(opts: {
    siteUrl: string;
    email: string;
    token: string;
    jql: string;
  }): Promise<JiraIssue[]>;
  listComments(opts: {
    siteUrl: string;
    email: string;
    token: string;
    key: string;
  }): Promise<{ id: string; author: string; body: string; createdAt: string }[]>;
  comment(opts: { siteUrl: string; email: string; token: string; key: string; body: string }): Promise<void>;
  writeDescription(opts: {
    siteUrl: string;
    email: string;
    token: string;
    key: string;
    description: string;
  }): Promise<void>;
  createIssue(opts: {
    siteUrl: string;
    email: string;
    token: string;
    projectKey: string;
    title: string;
    body: string;
  }): Promise<{ key: string }>;
  createSubtask(opts: {
    siteUrl: string;
    email: string;
    token: string;
    parentKey: string;
    title: string;
    body: string;
    labels: string[];
  }): Promise<{ key: string }>;
};

type FetchFn = typeof fetch;

export function createJiraClient(fetchFn: FetchFn = fetch): JiraClient {
  return {
    test: (siteUrl, email, token) => testJira(fetchFn, siteUrl, email, token),
    search: (opts) => searchJira(fetchFn, opts),
    listComments: (opts) => jiraComments(fetchFn, opts),
    comment: (opts) => jiraComment(fetchFn, opts),
    writeDescription: (opts) => jiraWriteDesc(fetchFn, opts),
    createIssue: (opts) => jiraCreateIssue(fetchFn, opts),
    createSubtask: (opts) => jiraSubtask(fetchFn, opts),
  };
}

async function jiraComment(
  fetchFn: FetchFn,
  opts: { siteUrl: string; email: string; token: string; key: string; body: string },
): Promise<void> {
  const base = opts.siteUrl.replace(/\/$/, "");
  const res = await fetchFn(`${base}/rest/api/3/issue/${opts.key}/comment`, {
    method: "POST",
    headers: { ...authHeaders(opts.email, opts.token), "Content-Type": "application/json" },
    body: JSON.stringify({ body: { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: opts.body }] }] } }),
  });
  await throwIfJiraFailed(res, "Jira comment failed");
}

async function jiraWriteDesc(
  fetchFn: FetchFn,
  opts: { siteUrl: string; email: string; token: string; key: string; description: string },
): Promise<void> {
  const base = opts.siteUrl.replace(/\/$/, "");
  const res = await fetchFn(`${base}/rest/api/3/issue/${opts.key}`, {
    method: "PUT",
    headers: { ...authHeaders(opts.email, opts.token), "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: {
        description: { ...markdownToAdf(opts.description), version: 1 },
      },
    }),
  });
  await throwIfJiraFailed(res, "Jira update failed");
}

async function jiraCreateIssue(
  fetchFn: FetchFn,
  opts: {
    siteUrl: string;
    email: string;
    token: string;
    projectKey: string;
    title: string;
    body: string;
  },
): Promise<{ key: string }> {
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
  return (await res.json()) as { key: string };
}

async function jiraSubtask(
  fetchFn: FetchFn,
  opts: {
    siteUrl: string;
    email: string;
    token: string;
    parentKey: string;
    title: string;
    body: string;
    labels: string[];
  },
): Promise<{ key: string }> {
  const base = opts.siteUrl.replace(/\/$/, "");
  const res = await fetchFn(`${base}/rest/api/3/issue`, {
    method: "POST",
    headers: { ...authHeaders(opts.email, opts.token), "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: {
        parent: { key: opts.parentKey },
        summary: opts.title,
        labels: opts.labels,
        description: { ...markdownToAdf(opts.body), version: 1 },
      },
    }),
  });
  await throwIfJiraFailed(res, "Jira subtask failed");
  return (await res.json()) as { key: string };
}

async function jiraComments(
  fetchFn: FetchFn,
  opts: { siteUrl: string; email: string; token: string; key: string },
): Promise<{ id: string; author: string; body: string; createdAt: string }[]> {
  const base = opts.siteUrl.replace(/\/$/, "");
  const res = await fetchFn(`${base}/rest/api/3/issue/${opts.key}/comment`, {
    headers: authHeaders(opts.email, opts.token),
  });
  await throwIfJiraFailed(res, "Jira comments failed");
  const data = (await res.json()) as {
    comments?: { id?: string; author?: { displayName?: string }; body?: unknown; created?: string }[];
  };
  return (data.comments ?? []).map((c) => ({
    id: String(c.id ?? ""),
    author: c.author?.displayName ?? "",
    body: adfToMarkdown(c.body),
    createdAt: c.created ?? "",
  }));
}

async function testJira(
  fetchFn: FetchFn,
  siteUrl: string,
  email: string,
  token: string,
): Promise<{ ok: boolean; detail: string }> {
  const base = siteUrl.replace(/\/$/, "");
  const res = await fetchFn(`${base}/rest/api/3/myself`, {
    headers: authHeaders(email, token),
  });
  if (!res.ok) {
    const err = await jiraHttpError(res, "Jira auth failed");
    return { ok: false, detail: err.message };
  }
  const me = (await res.json()) as { displayName?: string; emailAddress?: string };
  return {
    ok: true,
    detail: `Connected as ${me.displayName ?? me.emailAddress ?? email}`,
  };
}

export function adfToText(node: unknown): string {
  return adfToMarkdown(node);
}
