import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseJiraErrorBody } from "./http.ts";
import { searchJira } from "./search.ts";

const here = dirname(fileURLToPath(import.meta.url));
const page1 = readFileSync(join(here, "search.fixture.json"), "utf8");
const errBody = readFileSync(join(here, "search-error.fixture.json"), "utf8");

describe("searchJira", () => {
  it("POSTs /rest/api/3/search/jql and follows nextPageToken", async () => {
    const calls: { url: string; body: Record<string, unknown> }[] = [];
    const fetchFn = (async (url: string | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      calls.push({ url: String(url), body });
      if (!body.nextPageToken) {
        return new Response(page1, { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(
        JSON.stringify({
          issues: [
            {
              key: "PROJ-10",
              fields: { summary: "Page two", labels: [], updated: "2026-11-11T21:00:00.000+0000" },
            },
          ],
          isLast: true,
        }),
        { status: 200 },
      );
    }) as typeof fetch;
    const issues = await searchJira(fetchFn, {
      siteUrl: "https://ex.atlassian.net",
      email: "a@b.c",
      token: "t",
      jql: "assignee = currentUser() ORDER BY updated",
    });
    expect(calls[0]?.url).toBe("https://ex.atlassian.net/rest/api/3/search/jql");
    expect(calls[0]?.body).toMatchObject({
      jql: "assignee = currentUser() ORDER BY updated",
      maxResults: 50,
      fields: ["summary", "description", "labels", "updated"],
    });
    expect(calls.every((c) => !c.url.includes("/rest/api/3/search?"))).toBe(true);
    expect(calls.every((c) => !c.url.endsWith("/rest/api/3/search"))).toBe(true);
    expect(calls[1]?.body.nextPageToken).toBe("token-page-2");
    expect(issues.map((i) => i.key)).toEqual(["PROJ-9", "PROJ-10"]);
  });

  it("surfaces errorMessages from a recorded 400 body", async () => {
    const fetchFn = (async () => new Response(errBody, { status: 400 })) as typeof fetch;
    await expect(
      searchJira(fetchFn, {
        siteUrl: "https://ex.atlassian.net",
        email: "a@b.c",
        token: "t",
        jql: "(x ORDER BY updated) AND updated >= \"2026-11-11 20:15\"",
      }),
    ).rejects.toThrow(/400.*Expecting operator but got 'AND'/i);
  });
});

describe("parseJiraErrorBody", () => {
  it("reads errorMessages from a Cloud 400 payload", () => {
    expect(parseJiraErrorBody(errBody)).toMatch(/Expecting operator but got 'AND'/);
  });
});
