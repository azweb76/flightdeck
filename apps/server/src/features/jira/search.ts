import { adfToMarkdown } from "@flightdeck/shared";
import { authHeaders, jiraFetch } from "./http.ts";
import type { JiraIssue } from "./types.ts";

const MAX_PAGES = 10;

type JiraApiIssue = {
  key: string;
  fields?: { summary?: string; description?: unknown; updated?: string };
};

type SearchPage = { issues?: JiraApiIssue[]; nextPageToken?: string; isLast?: boolean };

/** POST /rest/api/3/search/jql — paginate with nextPageToken. */
export async function searchJira(
  fetchFn: typeof fetch,
  opts: { siteUrl: string; email: string; token: string; jql: string },
): Promise<JiraIssue[]> {
  const base = opts.siteUrl.replace(/\/$/, "");
  const url = `${base}/rest/api/3/search/jql`;
  const headers = { ...authHeaders(opts.email, opts.token), "Content-Type": "application/json" };
  const out: JiraIssue[] = [];
  let nextPageToken: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const body: Record<string, unknown> = {
      jql: opts.jql,
      maxResults: 50,
      fields: ["summary", "description", "updated"],
    };
    if (nextPageToken) body.nextPageToken = nextPageToken;
    const res = await jiraFetch(
      fetchFn,
      url,
      { method: "POST", headers, body: JSON.stringify(body) },
      "Jira search failed",
    );
    const data = (await res.json()) as SearchPage;
    out.push(...(data.issues ?? []).map((i) => toIssue(base, i)));
    if (data.isLast || !data.nextPageToken) break;
    nextPageToken = data.nextPageToken;
  }
  return out;
}

function toIssue(base: string, issue: JiraApiIssue): JiraIssue {
  return {
    key: issue.key,
    title: issue.fields?.summary ?? issue.key,
    body: adfToMarkdown(issue.fields?.description),
    url: `${base}/browse/${issue.key}`,
    updatedAt: issue.fields?.updated ?? new Date().toISOString(),
  };
}
