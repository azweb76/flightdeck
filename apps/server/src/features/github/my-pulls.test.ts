import { beforeEach, describe, expect, it } from "vitest";
import { resetCacheForTests } from "../cache/store.ts";
import { listAuthoredPulls } from "./my-pulls.ts";

describe("authored pulls", () => {
  beforeEach(() => resetCacheForTests());

  it("loads authored PRs in one GraphQL round trip", async () => {
    const seen: string[] = [];
    const fetchFn = (async (input: string | URL | Request) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
      seen.push(url.pathname);
      if (url.pathname === "/graphql") {
        return json({
          data: {
            search: {
              nodes: [
                {
                  number: 9,
                  title: "Mine",
                  url: "https://github.com/acme/web/pull/9",
                  isDraft: true,
                  updatedAt: "2026-11-15T00:00:00Z",
                  repository: { nameWithOwner: "acme/web" },
                  latestReviews: {
                    nodes: [{ state: "APPROVED", author: { login: "pat" } }],
                  },
                  commits: {
                    nodes: [
                      {
                        commit: {
                          oid: "abc",
                          statusCheckRollup: {
                            state: "SUCCESS",
                            contexts: [{ status: "COMPLETED", conclusion: "SUCCESS" }],
                          },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        });
      }
      return json({ message: url.pathname }, 500);
    }) as typeof fetch;

    const prs = await listAuthoredPulls("t", fetchFn);
    expect(prs).toHaveLength(1);
    expect(prs[0]?.review).toBe("approved");
    expect(prs[0]?.ci).toBe("passing");
    expect(seen.some((p) => p.endsWith("/reviews"))).toBe(false);
    expect(seen.some((p) => p.endsWith("/check-runs"))).toBe(false);
  });

  it("maps search hits to own PRs with CI and review", async () => {
    const fetchFn = (async (input: string | URL | Request) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
      if (url.pathname === "/search/issues") {
        return json({
          items: [
            {
              number: 9,
              title: "Mine",
              html_url: "https://github.com/acme/web/pull/9",
              draft: true,
              updated_at: "2026-11-15T00:00:00Z",
              repository_url: "https://api.github.com/repos/acme/web",
            },
          ],
        });
      }
      if (url.pathname.endsWith("/reviews")) {
        return json([
          { user: { login: "pat" }, state: "CHANGES_REQUESTED" },
          { user: { login: "pat" }, state: "APPROVED" },
        ]);
      }
      if (url.pathname.endsWith("/status")) return json({ state: "success", statuses: [] });
      if (url.pathname.endsWith("/check-runs")) return json({ check_runs: [] });
      return json({ message: url.pathname }, 500);
    }) as typeof fetch;

    const prs = await listAuthoredPulls("t", fetchFn);
    expect(prs).toHaveLength(1);
    expect(prs[0]?.number).toBe(9);
    expect(prs[0]?.draft).toBe(true);
    expect(prs[0]?.review).toBe("approved");
    expect(prs[0]?.needsYou).toBe(false);
  });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
