import type { GithubStatus } from "@flightdeck/shared";
import { defaultExec, type ExecFn } from "../exec/index.ts";
import {
  ghApiJson,
  listAssignedIssues,
  listVisibleRepos,
  type AssignedIssue,
} from "./assigned.ts";

export type GithubClient = {
  status(): Promise<GithubStatus>;
  listIssues(owner: string, name: string): Promise<GhIssue[]>;
  cloneRepo(owner: string, name: string, dest: string): Promise<{ ok: boolean; detail: string }>;
  createPr(opts: CreatePrOpts): Promise<{ url: string; number: number }>;
  commentIssue(owner: string, name: string, number: number, body: string): Promise<void>;
  commentPr(owner: string, name: string, number: number, body: string): Promise<void>;
  prChecks(owner: string, name: string, number: number): Promise<string>;
  prComments(owner: string, name: string, number: number): Promise<string>;
  prDiff(owner: string, name: string, number: number): Promise<string>;
  prView(owner: string, name: string, number: number): Promise<{ title: string; files: string }>;
  submitReview(
    owner: string,
    name: string,
    number: number,
    comments: { path: string; line: number; body: string }[],
  ): Promise<void>;
  createIssue(owner: string, name: string, title: string, body: string): Promise<{ number: number; url: string }>;
  writeIssue(owner: string, name: string, number: number, body: string): Promise<void>;
  listAssignedIssues(since?: string): Promise<AssignedIssue[]>;
  listVisibleRepos(): Promise<{ owner: string; name: string }[]>;
  getJson(path: string, etag?: string): Promise<{ status: number; etag?: string; body: string }>;
};

export type { AssignedIssue };

export type CreatePrOpts = {
  owner: string;
  name: string;
  title: string;
  body: string;
  draft: boolean;
  cwd?: string;
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
    createPr: (opts) => createPr(exec, opts),
    commentIssue: (owner, name, number, body) =>
      ghJson(exec, ["issue", "comment", String(number), "--repo", `${owner}/${name}`, "--body", body]),
    commentPr: (owner, name, number, body) =>
      ghJson(exec, ["pr", "comment", String(number), "--repo", `${owner}/${name}`, "--body", body]),
    prChecks: (owner, name, number) => prOut(exec, ["pr", "checks", String(number), "--repo", `${owner}/${name}`]),
    prComments: (owner, name, number) => prOut(exec, ["api", `repos/${owner}/${name}/pulls/${number}/comments`]),
    prDiff: (owner, name, number) => prOut(exec, ["pr", "diff", String(number), "--repo", `${owner}/${name}`]),
    prView: (owner, name, number) => prView(exec, owner, name, number),
    submitReview: (owner, name, number, comments) => submitReview(exec, owner, name, number, comments),
    createIssue: (owner, name, title, body) => createIssue(exec, owner, name, title, body),
    writeIssue: (owner, name, number, body) =>
      ghJson(exec, ["issue", "edit", String(number), "--repo", `${owner}/${name}`, "--body", body]),
    listAssignedIssues: (since) => listAssignedIssues(exec, since),
    listVisibleRepos: () => listVisibleRepos(exec),
    getJson: (path, etag) => ghApiJson(exec, path, etag),
  };
}

async function prOut(exec: ExecFn, args: string[]): Promise<string> {
  const r = await exec("gh", args);
  return r.stdout + r.stderr;
}

async function prView(exec: ExecFn, owner: string, name: string, number: number) {
  const r = await exec("gh", ["pr", "view", String(number), "--repo", `${owner}/${name}`, "--json", "title,files"]);
  const parsed = JSON.parse(r.stdout || "{}") as { title?: string; files?: unknown };
  return { title: parsed.title ?? "", files: JSON.stringify(parsed.files ?? []) };
}

async function submitReview(
  exec: ExecFn,
  owner: string,
  name: string,
  number: number,
  comments: { path: string; line: number; body: string }[],
) {
  await exec("gh", [
    "api",
    `repos/${owner}/${name}/pulls/${number}/reviews`,
    "-f",
    "event=COMMENT",
    "-f",
    "body=Flightdeck review",
    "-f",
    `comments=${JSON.stringify(comments)}`,
  ]);
}

async function createIssue(exec: ExecFn, owner: string, name: string, title: string, body: string) {
  const r = await exec("gh", [
    "issue",
    "create",
    "--repo",
    `${owner}/${name}`,
    "--title",
    title,
    "--body",
    body,
    "--json",
    "number,url",
  ]);
  if (r.code !== 0) throw new Error(r.stderr || "issue create failed");
  return JSON.parse(r.stdout) as { number: number; url: string };
}

async function ghJson(exec: ExecFn, args: string[]): Promise<void> {
  const r = await exec("gh", args);
  if (r.code !== 0) throw new Error(r.stderr || args.join(" "));
}

async function createPr(exec: ExecFn, opts: CreatePrOpts): Promise<{ url: string; number: number }> {
  const args = [
    "pr",
    "create",
    "--repo",
    `${opts.owner}/${opts.name}`,
    "--title",
    opts.title,
    "--body",
    opts.body,
  ];
  if (opts.draft) args.push("--draft");
  const r = await exec("gh", args, { cwd: opts.cwd, timeoutMs: 60_000 });
  if (r.code !== 0) throw new Error(r.stderr || "gh pr create failed");
  const url = r.stdout.trim().split("\n").at(-1) ?? "";
  const num = Number(url.split("/").at(-1));
  return { url, number: Number.isFinite(num) ? num : 0 };
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
