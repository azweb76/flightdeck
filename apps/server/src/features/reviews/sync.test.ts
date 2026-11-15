import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { resetCacheForTests } from "../cache/store.ts";
import { clearEtags } from "../github/etag.ts";
import { listStoredReviews, upsertReview } from "./store.ts";
import { listReviews, mergeRequests, refreshReviews } from "./sync.ts";

describe("review list sync", () => {
  const prevDemo = process.env.FLIGHTDECK_DEMO;
  const prevToken = process.env.GITHUB_TOKEN;

  beforeEach(() => {
    delete process.env.FLIGHTDECK_DEMO;
    process.env.GITHUB_TOKEN = "t";
    const dir = mkdtempSync(join(tmpdir(), "fd-rev-sync-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    resetDbForTests(join(dir, "app.sqlite"));
    resetCacheForTests();
    clearEtags();
  });

  afterEach(() => {
    closeDb();
    globalThis.fetch = origFetch;
    if (prevDemo === undefined) delete process.env.FLIGHTDECK_DEMO;
    else process.env.FLIGHTDECK_DEMO = prevDemo;
    if (prevToken === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = prevToken;
    delete process.env.FLIGHTDECK_DATA_DIR;
  });

  it("keeps stored rows when GitHub returns none", () => {
    upsertReview(stored(7, "selected"));
    const merged = mergeRequests([]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.number).toBe(7);
    expect(merged[0]?.status).toBe("selected");
  });

  it("GET listReviews syncs via Octokit and does not drop stored rows on an empty search", async () => {
    const seen: string[] = [];
    let items: unknown[] = [
      {
        number: 7,
        title: "Please review",
        html_url: "https://github.com/acme/web/pull/7",
        updated_at: "2026-11-15T00:00:00Z",
        user: { login: "alex" },
        repository_url: "https://api.github.com/repos/acme/web",
      },
    ];
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
      seen.push(url.pathname);
      if (url.pathname === "/search/issues") return json({ items });
      if (url.pathname === "/repos/acme/web/pulls/7") {
        return json({ head: { sha: "abc123" }, state: "open", merged: false });
      }
      return json({ message: url.pathname }, 500);
    }) as typeof fetch;

    const first = await listReviews();
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({ number: 7, headSha: "abc123", status: "requested" });
    expect(listStoredReviews()).toHaveLength(1);
    expect(seen.some((p) => p === "/search/issues")).toBe(true);

    items = [];
    const second = await refreshReviews();
    expect(second).toHaveLength(1);
    expect(second[0]?.number).toBe(7);
    expect(second[0]?.status).toBe("requested");
  });
});

const origFetch = globalThis.fetch;

function stored(number: number, status: "requested" | "selected") {
  return {
    id: `github:acme/web#${number}`,
    repoSlug: "acme/web",
    number,
    title: "Kept",
    url: `https://github.com/acme/web/pull/${number}`,
    author: "alex",
    headSha: "sha",
    status,
    selected: status === "selected",
    summary: "",
    skillPath: "",
    worktreePath: "",
    costUsd: 0,
    demo: false,
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
