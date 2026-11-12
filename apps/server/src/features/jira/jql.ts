import { DEFAULT_JIRA_JQL } from "@flightdeck/shared";

export function jiraDateTime(iso: string): string {
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (m) return `${m[1]} ${m[2]}`;
  return iso.slice(0, 16).replace("T", " ");
}

export function splitJqlOrderBy(jql: string): { clause: string; orderBy?: string } {
  const m = jql.trim().match(/^(.*?)(\bORDER\s+BY\b[\s\S]*)$/i);
  if (!m?.[2]) return { clause: jql.trim() };
  return { clause: (m[1] ?? "").trim(), orderBy: m[2].trim() };
}

export function jiraSearchJql(settingsJql: string | undefined, since?: string): string {
  const base = settingsJql?.trim() || DEFAULT_JIRA_JQL;
  if (!since) return base;
  const { clause, orderBy } = splitJqlOrderBy(base);
  const filtered = `(${clause}) AND updated >= "${jiraDateTime(since)}"`;
  return orderBy ? `${filtered} ${orderBy}` : filtered;
}
