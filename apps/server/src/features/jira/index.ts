export type JiraIssue = {
  key: string;
  title: string;
  body: string;
  url: string;
  labels: string[];
  updatedAt: string;
};

export type JiraClient = {
  test(siteUrl: string, email: string, token: string): Promise<{ ok: boolean; detail: string }>;
  search(opts: {
    siteUrl: string;
    email: string;
    token: string;
    jql: string;
  }): Promise<JiraIssue[]>;
};

type FetchFn = typeof fetch;

export function createJiraClient(fetchFn: FetchFn = fetch): JiraClient {
  return {
    test: (siteUrl, email, token) => testJira(fetchFn, siteUrl, email, token),
    search: (opts) => searchJira(fetchFn, opts),
  };
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
    return { ok: false, detail: `Jira auth failed (${res.status})` };
  }
  const me = (await res.json()) as { displayName?: string; emailAddress?: string };
  return {
    ok: true,
    detail: `Connected as ${me.displayName ?? me.emailAddress ?? email}`,
  };
}

async function searchJira(
  fetchFn: FetchFn,
  opts: { siteUrl: string; email: string; token: string; jql: string },
): Promise<JiraIssue[]> {
  const base = opts.siteUrl.replace(/\/$/, "");
  const url = new URL(`${base}/rest/api/3/search/jql`);
  url.searchParams.set("jql", opts.jql);
  url.searchParams.set("maxResults", "50");
  url.searchParams.set("fields", "summary,description,labels,updated");
  const res = await fetchFn(url, { headers: authHeaders(opts.email, opts.token) });
  if (!res.ok) {
    const fallback = await searchLegacy(fetchFn, base, opts);
    if (fallback) return fallback;
    throw new Error(`Jira search failed (${res.status})`);
  }
  const data = (await res.json()) as { issues?: JiraApiIssue[] };
  return (data.issues ?? []).map((i) => toIssue(base, i));
}

async function searchLegacy(
  fetchFn: FetchFn,
  base: string,
  opts: { email: string; token: string; jql: string },
): Promise<JiraIssue[] | undefined> {
  const res = await fetchFn(`${base}/rest/api/3/search`, {
    method: "POST",
    headers: { ...authHeaders(opts.email, opts.token), "Content-Type": "application/json" },
    body: JSON.stringify({
      jql: opts.jql,
      maxResults: 50,
      fields: ["summary", "description", "labels", "updated"],
    }),
  });
  if (!res.ok) return undefined;
  const data = (await res.json()) as { issues?: JiraApiIssue[] };
  return (data.issues ?? []).map((i) => toIssue(base, i));
}

type JiraApiIssue = {
  key: string;
  fields?: {
    summary?: string;
    description?: unknown;
    labels?: string[];
    updated?: string;
  };
};

function toIssue(base: string, issue: JiraApiIssue): JiraIssue {
  return {
    key: issue.key,
    title: issue.fields?.summary ?? issue.key,
    body: adfToText(issue.fields?.description),
    url: `${base}/browse/${issue.key}`,
    labels: issue.fields?.labels ?? [],
    updatedAt: issue.fields?.updated ?? new Date().toISOString(),
  };
}

function authHeaders(email: string, token: string): Record<string, string> {
  const basic = Buffer.from(`${email}:${token}`).toString("base64");
  return { Authorization: `Basic ${basic}`, Accept: "application/json" };
}

export function adfToText(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(adfToText).join("");
  if (typeof node !== "object") return "";
  const n = node as { type?: string; text?: string; content?: unknown[] };
  if (n.type === "text") return n.text ?? "";
  const inner = (n.content ?? []).map(adfToText).join("");
  if (n.type === "paragraph" || n.type === "heading") return `${inner}\n\n`;
  if (n.type === "listItem") return `- ${inner.trim()}\n`;
  return inner;
}
