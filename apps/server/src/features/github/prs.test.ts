import { beforeEach, describe, expect, it } from "vitest";
import { resetCacheForTests } from "../cache/store.ts";
import { getPullState } from "./prs.ts";

describe("pull state", () => {
  beforeEach(() => resetCacheForTests());

  it("caches pulls.get and sends If-None-Match on a fresh refetch", async () => {
    const seen: string[] = [];
    let round = 0;
    const fetchFn = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
      seen.push(`${(init?.method ?? "GET").toUpperCase()} ${url.pathname}`);
      const inm = new Headers(init?.headers).get("if-none-match") || new Headers(init?.headers).get("If-None-Match");
      if (inm === 'W/"p1"' && round > 0) return new Response(null, { status: 304, headers: { etag: 'W/"p1"' } });
      if (url.pathname.endsWith("/pulls/9")) {
        return json(
          {
            state: "open",
            merged: false,
            created_at: "2026-11-15T00:00:00Z",
            updated_at: "2026-11-15T00:00:00Z",
            head: { sha: "abc" },
          },
          { etag: 'W/"p1"' },
        );
      }
      if (url.pathname.endsWith("/commits/abc")) {
        return json({ commit: { committer: { date: "2026-11-15T00:01:00Z" }, author: { date: "2026-11-15T00:01:00Z" } } });
      }
      return json({ message: url.pathname }, {}, 500);
    }) as typeof fetch;

    const first = await getPullState("t", fetchFn, "acme", "web", 9);
    expect(first.state).toBe("open");
    expect(first.committedAt).toBe("2026-11-15T00:01:00Z");
    expect(seen.filter((s) => s.includes("/pulls/9"))).toHaveLength(1);
    const cached = await getPullState("t", fetchFn, "acme", "web", 9);
    expect(cached.state).toBe("open");
    expect(seen.filter((s) => s.includes("/pulls/9"))).toHaveLength(1);
    round = 1;
    resetCacheForTests();
    const third = await getPullState("t", fetchFn, "acme", "web", 9);
    expect(third.state).toBe("open");
    expect(seen.filter((s) => s.includes("/pulls/9")).length).toBeGreaterThan(1);
  });
});

function json(body: unknown, headers: Record<string, string> = {}, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}
