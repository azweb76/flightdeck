import type { ExecFn } from "../exec/index.ts";

export type AssignedIssue = {
  number: number;
  title: string;
  body: string;
  url: string;
  updatedAt: string;
  owner: string;
  name: string;
};

export async function listAssignedIssues(exec: ExecFn, since?: string): Promise<AssignedIssue[]> {
  const query = ["is:issue", "is:open", "assignee:@me"];
  if (since) query.push(`updated:>=${since.slice(0, 10)}`);
  const r = await exec("gh", [
    "search",
    "issues",
    query.join(" "),
    "--limit",
    "50",
    "--json",
    "number,title,body,url,updatedAt,repository",
  ]);
  if (r.code !== 0) throw new Error(r.stderr || "gh search issues failed");
  const parsed = JSON.parse(r.stdout || "[]") as Record<string, unknown>[];
  return parsed.map(toAssigned);
}

export async function listVisibleRepos(exec: ExecFn): Promise<{ owner: string; name: string }[]> {
  const r = await exec("gh", [
    "api",
    "--paginate",
    "user/repos?affiliation=owner,collaborator,organization_member&per_page=100",
  ]);
  if (r.code !== 0) throw new Error(r.stderr || "gh user/repos failed");
  return parseRepoList(r.stdout);
}

export function parseRepoList(stdout: string): { owner: string; name: string }[] {
  const rows = parseJsonRows(stdout);
  return rows
    .map((row) => {
      const slug = String(row.full_name ?? row.nameWithOwner ?? "");
      const [owner, name] = slug.includes("/")
        ? slug.split("/")
        : [String((row.owner as { login?: string } | undefined)?.login ?? ""), String(row.name ?? "")];
      return owner && name ? { owner, name } : undefined;
    })
    .filter((x): x is { owner: string; name: string } => Boolean(x));
}

function parseJsonRows(stdout: string): Record<string, unknown>[] {
  const text = stdout.trim() || "[]";
  try {
    const parsed = JSON.parse(text) as unknown;
    return Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : [];
  } catch {
    const joined = text.replace(/\]\s*\[/g, ",");
    const parsed = JSON.parse(joined) as unknown;
    return Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : [];
  }
}

export async function ghApiJson(
  exec: ExecFn,
  path: string,
  etag?: string,
): Promise<{ status: number; etag?: string; body: string }> {
  const args = ["api", "--include", path];
  if (etag) args.push("-H", `If-None-Match: ${etag}`);
  const r = await exec("gh", args);
  return parseIncluded(r.stdout + r.stderr, r.code);
}

function parseIncluded(text: string, code: number): { status: number; etag?: string; body: string } {
  const split = text.indexOf("\r\n\r\n") >= 0 ? text.indexOf("\r\n\r\n") : text.indexOf("\n\n");
  const headers = split >= 0 ? text.slice(0, split) : "";
  const body = split >= 0 ? text.slice(split).trim() : text.trim();
  const etag = headers.match(/^etag:\s*(.+)$/im)?.[1]?.trim();
  const status = Number(headers.match(/HTTP\/\S+\s+(\d+)/i)?.[1] ?? (code === 0 ? 200 : 500));
  return { status, etag, body };
}

function toAssigned(row: Record<string, unknown>): AssignedIssue {
  const repo = row.repository as { nameWithOwner?: string; owner?: { login?: string }; name?: string } | undefined;
  const slug = repo?.nameWithOwner ?? "";
  const [owner, name] = slug.includes("/")
    ? slug.split("/")
    : [repo?.owner?.login ?? "", repo?.name ?? ""];
  return {
    number: Number(row.number),
    title: String(row.title ?? ""),
    body: String(row.body ?? ""),
    url: String(row.url ?? ""),
    updatedAt: String(row.updatedAt ?? new Date().toISOString()),
    owner: owner ?? "",
    name: name ?? "",
  };
}
