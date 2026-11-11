import type { BoardPr } from "@flightdeck/shared";
import type { ExecFn } from "../exec/index.ts";
import { parseGraphqlErrors, parsePageInfo, parseSearchPayload, parseViewerLogin } from "./parse.ts";
import { PR_SEARCH_QUERY, VIEWER_LOGIN_QUERY, prSearchQueries } from "./query.ts";

const MAX_PAGES = 10;

export async function fetchViewerLogin(exec: ExecFn): Promise<string> {
  const r = await exec("gh", ["api", "graphql", "-f", `query=${VIEWER_LOGIN_QUERY}`], { timeoutMs: 15_000 });
  if (r.code !== 0) throw new Error(r.stderr || "gh viewer login failed");
  const raw = stripHttp(r.stdout + r.stderr);
  const err = parseGraphqlErrors(raw);
  if (err) throw new Error(err);
  const login = parseViewerLogin(raw);
  if (!login) throw new Error("GraphQL viewer login was empty");
  return login;
}

export async function searchOpenPrs(
  exec: ExecFn,
  opts: { authored: boolean; review: boolean; login: string; projectKeys: string[] },
): Promise<BoardPr[]> {
  const queries = prSearchQueries({ authored: opts.authored, review: opts.review, login: opts.login });
  const byId = new Map<string, BoardPr>();
  for (const query of queries) {
    for (const pr of await searchOne(exec, query, opts.login, opts.projectKeys)) {
      byId.set(pr.id, pr);
    }
  }
  return [...byId.values()];
}

async function searchOne(exec: ExecFn, search: string, login: string, projectKeys: string[]): Promise<BoardPr[]> {
  const pages: BoardPr[] = [];
  let after: string | undefined;
  for (let i = 0; i < MAX_PAGES; i++) {
    const raw = await graphqlPage(exec, search, after);
    const gqlErr = parseGraphqlErrors(raw);
    if (gqlErr) throw new Error(gqlErr);
    pages.push(...parseSearchPayload(raw, login, projectKeys));
    const info = parsePageInfo(raw);
    if (!info.hasNextPage || !info.endCursor) break;
    after = info.endCursor;
  }
  return pages;
}

async function graphqlPage(exec: ExecFn, search: string, after?: string): Promise<string> {
  const args = ["api", "graphql", "--include", "-f", `query=${PR_SEARCH_QUERY}`, "-f", `q=${search}`];
  if (after) args.push("-f", `after=${after}`);
  const r = await exec("gh", args, { timeoutMs: 30_000 });
  const parsed = splitIncluded(r.stdout + r.stderr, r.code);
  if (parsed.status >= 400) throw new Error(parsed.body || "graphql search failed");
  return parsed.body;
}

function stripHttp(text: string): string {
  const split = text.indexOf("\r\n\r\n") >= 0 ? text.indexOf("\r\n\r\n") : text.indexOf("\n\n");
  if (split < 0) return text.trim();
  return text.slice(split).trim();
}

function splitIncluded(text: string, code: number): { status: number; body: string } {
  const split = text.indexOf("\r\n\r\n") >= 0 ? text.indexOf("\r\n\r\n") : text.indexOf("\n\n");
  const headers = split >= 0 ? text.slice(0, split) : "";
  const body = split >= 0 ? text.slice(split).trim() : text.trim();
  const status = Number(headers.match(/HTTP\/\S+\s+(\d+)/i)?.[1] ?? (code === 0 ? 200 : 500));
  return { status, body };
}
