import { beforeEach, describe, expect, it } from "vitest";
import { resetCacheForTests } from "../cache/store.ts";
import { clearEtags } from "./etag.ts";
import { listReviewRequests } from "./review-requests.ts";

describe("listReviewRequests", () => {
  beforeEach(() => {
    resetCacheForTests();
    clearEtags();
  });

  it("searches review-requested PRs and loads head SHA via pulls.get", async () => {
    const seen: string[] = [];
    const fetchFn = (async (input: string | URL | Request) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
      seen.push(`${url.pathname}${url.search}`);
      if (url.pathname === "/search/issues") {
        expect(url.search).toContain("review-requested");
        return json({
          items: [
            {
              number: 7,
              title: "Please review",
              html_url: "https://github.com/acme/web/pull/7",
              updated_at: "2026-11-15T00:00:00Z",
              user: { login: "alex" },
              repository_url: "https://api.github.com/repos/acme/web",
            },
          ],
        });
      }
      if (url.pathname === "/repos/acme/web/pulls/7") {
        return json({ head: { sha: "abc123" }, state: "open", merged: false });
      }
      return json({ message: url.pathname }, 500);
    }) as typeof fetch;

    const prs = await listReviewRequests("t", fetchFn);
    expect(prs).toEqual([
      {
        id: "github:acme/web#7",
        repoSlug: "acme/web",
        number: 7,
        title: "Please review",
        url: "https://github.com/acme/web/pull/7",
        author: "alex",
        headSha: "abc123",
        updatedAt: "2026-11-15T00:00:00Z",
      },
    ]);
    expect(seen.some((s) => s.startsWith("/search/issues"))).toBe(true);
  });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
