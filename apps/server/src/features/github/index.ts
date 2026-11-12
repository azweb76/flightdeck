import type { CatalogRepo, GithubStatus } from "@flightdeck/shared";
import { defaultExec, type ExecFn } from "../exec/index.ts";

export type GhIssue = {
  id: string;
  number: number;
  title: string;
  body: string;
  url: string;
  updatedAt: string;
  owner: string;
  name: string;
};

export type GithubClient = {
  status(): Promise<GithubStatus>;
  listAssignedIssues(): Promise<GhIssue[]>;
  listRepos(): Promise<CatalogRepo[]>;
  cloneRepo(owner: string, name: string, dest: string): Promise<{ ok: boolean; detail: string }>;
  createIssue(owner: string, name: string, title: string, body: string): Promise<{ number: number; url: string }>;
  updateIssue(owner: string, name: string, number: number, title: string, body: string): Promise<void>;
};

export function createGithubClient(exec: ExecFn = defaultExec): GithubClient {
  return {
    status: () => githubStatus(exec),
    listAssignedIssues: () => listAssigned(exec),
    listRepos: () => listRepos(exec),
    cloneRepo: (owner, name, dest) => cloneRepo(exec, owner, name, dest),
    createIssue: (owner, name, title, body) => createIssue(exec, owner, name, title, body),
    updateIssue: (owner, name, number, title, body) => updateIssue(exec, owner, name, number, title, body),
  };
}

export async function githubStatus(exec: ExecFn): Promise<GithubStatus> {
  const [version, auth] = await Promise.all([
    exec("gh", ["--version"], { timeoutMs: 5_000 }),
    exec("gh", ["auth", "status"], { timeoutMs: 8_000 }),
  ]);
  if (version.code !== 0) return { installed: false, loggedIn: false, detail: "gh is not installed" };
  const loggedIn = auth.code === 0;
  const user = loggedIn ? parseUser(auth.stderr + auth.stdout) : undefined;
  return {
    installed: true,
    loggedIn,
    user,
    detail: loggedIn ? `gh logged in${user ? ` as ${user}` : ""}` : "gh is installed but not logged in",
  };
}

async function listAssigned(exec: ExecFn): Promise<GhIssue[]> {
  const r = await exec("gh", [
    "search",
    "issues",
    "is:issue is:open assignee:@me",
    "--limit",
    "50",
    "--json",
    "number,title,body,url,updatedAt,repository",
  ]);
  if (r.code !== 0) throw new Error(r.stderr || "gh search issues failed");
  const parsed = JSON.parse(r.stdout || "[]") as Record<string, unknown>[];
  return parsed.map(toIssue);
}

async function listRepos(exec: ExecFn): Promise<CatalogRepo[]> {
  const r = await exec("gh", [
    "api",
    "--paginate",
    "user/repos?affiliation=owner,collaborator,organization_member&per_page=100",
  ]);
  if (r.code !== 0) throw new Error(r.stderr || "gh user/repos failed");
  const rows = JSON.parse(r.stdout || "[]") as { full_name?: string }[];
  return rows
    .map((row) => {
      const [owner, name] = (row.full_name ?? "").split("/");
      return owner && name ? { owner, name, localPath: "" } : undefined;
    })
    .filter((x): x is CatalogRepo => Boolean(x));
}

async function cloneRepo(exec: ExecFn, owner: string, name: string, dest: string) {
  const r = await exec("gh", ["repo", "clone", `${owner}/${name}`, dest], { timeoutMs: 120_000 });
  if (r.code !== 0) return { ok: false, detail: r.stderr || "clone failed" };
  return { ok: true, detail: dest };
}

export const GH_ISSUE_CREATE_ARGS = (owner: string, name: string, title: string, body: string) =>
  ["issue", "create", "--repo", `${owner}/${name}`, "--title", title, "--body", body];

async function createIssue(exec: ExecFn, owner: string, name: string, title: string, body: string) {
  const args = GH_ISSUE_CREATE_ARGS(owner, name, title, body);
  const r = await exec("gh", args);
  if (r.code !== 0) throw new Error(r.stderr || "gh issue create failed");
  return parseCreatedIssue(r.stdout);
}

export function parseCreatedIssue(stdout: string): { number: number; url: string } {
  const url = stdout
    .split(/\s+/)
    .map((s) => s.trim())
    .find((s) => /github\.com\/.+\/issues\/\d+/.test(s));
  const number = Number(url?.match(/\/issues\/(\d+)/)?.[1]);
  if (!url || !number) throw new Error("Could not parse GitHub issue URL from gh output");
  return { number, url };
}

async function updateIssue(exec: ExecFn, owner: string, name: string, number: number, title: string, body: string) {
  const r = await exec("gh", [
    "issue",
    "edit",
    String(number),
    "--repo",
    `${owner}/${name}`,
    "--title",
    title,
    "--body",
    body,
  ]);
  if (r.code !== 0) throw new Error(r.stderr || "gh issue edit failed");
}

function toIssue(row: Record<string, unknown>): GhIssue {
  const repo = row.repository as { nameWithOwner?: string } | undefined;
  const [owner, name] = (repo?.nameWithOwner ?? "/").split("/");
  const number = Number(row.number);
  return {
    id: `github:${owner}/${name}#${number}`,
    number,
    title: String(row.title ?? ""),
    body: String(row.body ?? ""),
    url: String(row.url ?? ""),
    updatedAt: String(row.updatedAt ?? new Date().toISOString()),
    owner: owner ?? "",
    name: name ?? "",
  };
}

function parseUser(text: string): string | undefined {
  return text.match(/Logged in to github.com account (\S+)/)?.[1];
}
