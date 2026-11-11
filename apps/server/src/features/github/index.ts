import type { GithubStatus } from "@flightdeck/shared";
import { defaultExec, type ExecFn } from "../exec/index.ts";

export type GithubClient = {
  status(): Promise<GithubStatus>;
  listIssues(owner: string, name: string): Promise<GhIssue[]>;
  cloneRepo(owner: string, name: string, dest: string): Promise<{ ok: boolean; detail: string }>;
};

export type GhIssue = {
  number: number;
  title: string;
  body: string;
  url: string;
  updatedAt: string;
};

export function createGithubClient(exec: ExecFn = defaultExec): GithubClient {
  return {
    status: () => githubStatus(exec),
    listIssues: (owner, name) => listIssues(exec, owner, name),
    cloneRepo: (owner, name, dest) => cloneRepo(exec, owner, name, dest),
  };
}

export async function githubStatus(exec: ExecFn = defaultExec): Promise<GithubStatus> {
  const version = await exec("gh", ["--version"], { timeoutMs: 5_000 });
  if (version.code !== 0) {
    return {
      installed: false,
      loggedIn: false,
      detail: "gh is not installed",
    };
  }
  const auth = await exec("gh", ["auth", "status"], { timeoutMs: 8_000 });
  const loggedIn = auth.code === 0;
  const user = loggedIn ? parseUser(auth.stderr + auth.stdout) : undefined;
  return {
    installed: true,
    loggedIn,
    user,
    detail: loggedIn
      ? `gh logged in${user ? ` as ${user}` : ""}`
      : "gh is installed but not logged in",
  };
}

async function listIssues(exec: ExecFn, owner: string, name: string): Promise<GhIssue[]> {
  const r = await exec("gh", [
    "issue",
    "list",
    "--repo",
    `${owner}/${name}`,
    "--state",
    "open",
    "--limit",
    "50",
    "--json",
    "number,title,body,url,updatedAt",
  ]);
  if (r.code !== 0) throw new Error(r.stderr || `gh issue list failed for ${owner}/${name}`);
  const parsed = JSON.parse(r.stdout) as GhIssue[];
  return parsed.map((i) => ({
    number: i.number,
    title: i.title,
    body: i.body ?? "",
    url: i.url,
    updatedAt: i.updatedAt,
  }));
}

async function cloneRepo(
  exec: ExecFn,
  owner: string,
  name: string,
  dest: string,
): Promise<{ ok: boolean; detail: string }> {
  const r = await exec("gh", ["repo", "clone", `${owner}/${name}`, dest], { timeoutMs: 120_000 });
  if (r.code !== 0) return { ok: false, detail: r.stderr || "clone failed" };
  return { ok: true, detail: `cloned into ${dest}` };
}

function parseUser(text: string): string | undefined {
  const m = text.match(/account\s+(\S+)/i) ?? text.match(/Logged in to \S+ account (\S+)/i);
  return m?.[1];
}
