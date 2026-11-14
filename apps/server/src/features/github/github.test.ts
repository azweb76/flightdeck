import { beforeEach, describe, expect, it } from "vitest";
import { resetCacheForTests } from "../cache/store.ts";
import { setSleepForTests } from "../cache/retry.ts";
import { createGithubClient } from "./index.ts";

describe("github octokit adapter", () => {
  beforeEach(() => {
    resetCacheForTests();
    setSleepForTests();
    delete process.env.FLIGHTDECK_DEMO;
  });

  it("lists assigned issues and reports the login", async () => {
    const gh = createGithubClient({ token: "t", fetch: mockFetch() });
    const status = await gh.status();
    expect(status).toMatchObject({ loggedIn: true, user: "dan" });
    expect(status.scopes).toEqual(["repo", "read:org", "workflow"]);
    const issues = await gh.listAssignedIssues();
    expect(issues[0]?.id).toBe("github:acme/web#12");
  });

  it("creates and updates issues", async () => {
    const seen: string[] = [];
    const gh = createGithubClient({
      token: "t",
      fetch: mockFetch({
        onRequest: (method, url) => seen.push(`${method} ${url.pathname}`),
      }),
    });
    const created = await gh.createIssue("acme", "web", "T", "B");
    expect(created).toEqual({ number: 9, url: "https://github.com/acme/web/issues/9" });
    await gh.updateIssue("acme", "web", 9, "T2", "B2");
    expect(seen).toContain("POST /repos/acme/web/issues");
    expect(seen).toContain("PATCH /repos/acme/web/issues/9");
  });

  it("paginates user repos", async () => {
    const gh = createGithubClient({ token: "t", fetch: mockFetch() });
    const repos = await gh.listRepos();
    expect(repos.map((r) => r.name)).toEqual(["web", "api"]);
    await gh.listRepos();
  });

  it("backs off on 403 primary and 429 secondary rate limits", async () => {
    const sleeps: number[] = [];
    setSleepForTests(async (ms) => {
      sleeps.push(ms);
    });
    let searches = 0;
    const gh = createGithubClient({
      token: "t",
      fetch: mockFetch({
        search: () => {
          searches += 1;
          if (searches === 1) {
            return json(
              { message: "API rate limit exceeded" },
              403,
              { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 2) },
            );
          }
          if (searches === 2) {
            return json({ message: "You have exceeded a secondary rate limit" }, 429, { "retry-after": "1" });
          }
          return json({ items: [] });
        },
      }),
    });
    expect(await gh.listAssignedIssues()).toEqual([]);
    expect(searches).toBe(3);
    expect(sleeps.length).toBe(2);
  });

  it("rejects a bad token", async () => {
    const bad = createGithubClient({
      token: "bad",
      fetch: mockFetch({ user: () => json({ message: "Bad credentials" }, 401) }),
    });
    expect((await bad.status()).loggedIn).toBe(false);
    expect((await bad.status()).detail).toMatch(/401/);
  });

  it("rejects a token missing required scopes", async () => {
    const skinny = createGithubClient({
      token: "t",
      fetch: mockFetch({ user: () => json({ login: "dan" }, 200, { "x-oauth-scopes": "repo" }) }),
    });
    const st = await skinny.status();
    expect(st.loggedIn).toBe(false);
    expect(st.detail).toMatch(/missing scopes/);
  });

  it("invalidates assigned issues after create", async () => {
    let searches = 0;
    const gh = createGithubClient({
      token: "t",
      fetch: mockFetch({
        search: () => {
          searches += 1;
          return json({ items: [] });
        },
      }),
    });
    await gh.listAssignedIssues();
    await gh.createIssue("acme", "web", "T", "B");
    await gh.listAssignedIssues();
    expect(searches).toBe(2);
  });
});

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function mockFetch(opts?: {
  onRequest?: (method: string, url: URL) => void;
  user?: () => Response;
  search?: () => Response;
}): typeof fetch {
  return (async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
    const method = (init?.method ?? "GET").toUpperCase();
    opts?.onRequest?.(method, url);
    if (url.pathname === "/user" && method === "GET") {
      return (opts?.user ?? (() => json({ login: "dan" }, 200, { "x-oauth-scopes": "repo,read:org,workflow" })))();
    }
    if (url.pathname === "/search/issues") {
      return (opts?.search ?? (() => json({ items: [searchItem()] })))();
    }
    if (url.pathname === "/user/repos") {
      if (url.searchParams.get("page") === "2") return json([{ full_name: "acme/api" }]);
      return json([{ full_name: "acme/web" }], 200, {
        link: `<${url.origin}/user/repos?page=2&per_page=100>; rel="next"`,
      });
    }
    if (url.pathname === "/repos/acme/web/issues" && method === "POST") {
      return json({ number: 9, html_url: "https://github.com/acme/web/issues/9" }, 201);
    }
    if (url.pathname === "/repos/acme/web/issues/9" && method === "PATCH") {
      return json({ number: 9, html_url: "https://github.com/acme/web/issues/9" });
    }
    return json({ message: `unexpected ${method} ${url.pathname}` }, 500);
  }) as typeof fetch;
}

function searchItem() {
  return {
    number: 12,
    title: "Mine",
    body: "b",
    html_url: "https://github.com/acme/web/issues/12",
    updated_at: "2026-11-12T00:00:00Z",
    repository_url: "https://api.github.com/repos/acme/web",
  };
}
