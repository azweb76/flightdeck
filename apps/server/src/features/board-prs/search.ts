import { cacheGet, cacheSet } from "../cache/index.ts";
import type { ExecFn } from "../exec/index.ts";
import { parsePageInfo, parseSearchPayload, parseViewerLogin } from "./parse.ts";
import { PR_SEARCH_QUERY } from "./query.ts";
import type { BoardPr } from "@flightdeck/shared";

export async function searchOpenPrs(
  exec: ExecFn,
  search: string,
  projectKeys: string[],
): Promise<BoardPr[]> {
  const pages: BoardPr[] = [];
  let after: string | undefined;
  let viewer = "";
  for (let i = 0; i < 4; i++) {
    const raw = await graphqlPage(exec, search, after);
    if (!viewer) viewer = parseViewerLogin(raw);
    pages.push(...parseSearchPayload(raw, viewer, projectKeys));
    const info = parsePageInfo(raw);
    if (!info.hasNextPage || !info.endCursor) break;
    after = info.endCursor;
  }
  return pages;
}

async function graphqlPage(exec: ExecFn, search: string, after?: string): Promise<string> {
  const cacheKey = `prs:gql:${search}:${after ?? ""}`;
  const cached = cacheGet(cacheKey);
  const args = ["api", "graphql", "--include", "-f", `query=${PR_SEARCH_QUERY}`, "-f", `q=${search}`];
  if (after) args.push("-f", `after=${after}`);
  if (cached?.etag) args.push("-H", `If-None-Match: ${cached.etag}`);
  const r = await exec("gh", args, { timeoutMs: 30_000 });
  const parsed = splitIncluded(r.stdout + r.stderr, r.code);
  if (parsed.status === 304 && cached) return cached.body;
  if (parsed.status >= 400) throw new Error(parsed.body || "graphql search failed");
  cacheSet(cacheKey, parsed.body, parsed.etag);
  return parsed.body;
}

function splitIncluded(text: string, code: number): { status: number; etag?: string; body: string } {
  const split = text.indexOf("\r\n\r\n") >= 0 ? text.indexOf("\r\n\r\n") : text.indexOf("\n\n");
  const headers = split >= 0 ? text.slice(0, split) : "";
  const body = split >= 0 ? text.slice(split).trim() : text.trim();
  const etag = headers.match(/^etag:\s*(.+)$/im)?.[1]?.trim();
  const status = Number(headers.match(/HTTP\/\S+\s+(\d+)/i)?.[1] ?? (code === 0 ? 200 : 500));
  return { status, etag, body };
}
