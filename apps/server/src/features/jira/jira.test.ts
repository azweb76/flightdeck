import { markdownToAdf } from "@flightdeck/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { resetCacheForTests } from "../cache/store.ts";
import { setSleepForTests } from "../cache/retry.ts";
import { createJiraClient } from "./index.ts";
import { jiraSearchJql } from "./jql.ts";

describe("jira adapter", () => {
  beforeEach(() => {
    resetCacheForTests();
    setSleepForTests();
  });

  it("POSTs search/jql and maps ADF descriptions", async () => {
    const calls: { url: string; body: unknown }[] = [];
    const fetchFn = (async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), body: JSON.parse(String(init?.body ?? "{}")) });
      return new Response(
        JSON.stringify({
          isLast: true,
          issues: [
            {
              key: "PROJ-1",
              fields: {
                summary: "CSV",
                description: markdownToAdf("Ship it"),
                updated: "2026-11-12T00:00:00.000Z",
              },
            },
          ],
        }),
        { status: 200 },
      );
    }) as typeof fetch;
    const issues = await createJiraClient(fetchFn).search({
      siteUrl: "https://ex.atlassian.net",
      email: "a@b.c",
      token: "t",
      jql: "assignee = currentUser() ORDER BY updated",
    });
    expect(calls[0]?.url).toBe("https://ex.atlassian.net/rest/api/3/search/jql");
    expect(issues[0]?.body).toContain("Ship it");
  });

  it("keeps ORDER BY last on incremental JQL", () => {
    const jql = jiraSearchJql("assignee = currentUser() ORDER BY updated DESC", "2026-11-11T12:00:00Z");
    expect(jql.endsWith("ORDER BY updated DESC")).toBe(true);
    expect(jql).toContain('updated >= "2026-11-11 12:00"');
  });

  it("creates an issue with ADF description", async () => {
    const fetchFn = (async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { fields?: { description?: { type?: string } } };
      expect(body.fields?.description?.type).toBe("doc");
      return new Response(JSON.stringify({ key: "PROJ-9" }), { status: 201 });
    }) as typeof fetch;
    const created = await createJiraClient(fetchFn).createIssue({
      siteUrl: "https://ex.atlassian.net",
      email: "a@b.c",
      token: "t",
      projectKey: "PROJ",
      title: "T",
      body: "## Goal\n\nHi",
    });
    expect(created.key).toBe("PROJ-9");
  });

  it("caches search by site+email+jql and connect tests by site+email", async () => {
    let n = 0;
    const fetchFn = (async (url: string) => {
      n += 1;
      if (String(url).includes("/myself")) {
        return new Response(JSON.stringify({ displayName: "Dan" }), { status: 200 });
      }
      return new Response(JSON.stringify({ isLast: true, issues: [] }), { status: 200 });
    }) as typeof fetch;
    const client = createJiraClient(fetchFn);
    const opts = { siteUrl: "https://ex.atlassian.net", email: "a@b.c", token: "t", jql: "assignee = currentUser()" };
    await client.search(opts);
    await client.search(opts);
    await client.test(opts.siteUrl, opts.email, "t");
    await client.test(opts.siteUrl, opts.email, "t");
    expect(n).toBe(2);
  });

  it("honors 429 Retry-After and surfaces a friendly error after retries", async () => {
    const sleeps: number[] = [];
    setSleepForTests(async (ms) => {
      sleeps.push(ms);
    });
    let n = 0;
    const okFetch = (async () => {
      n += 1;
      if (n === 1) return new Response("rate limited", { status: 429, headers: { "Retry-After": "2" } });
      return new Response(
        JSON.stringify({ isLast: true, issues: [{ key: "PROJ-1", fields: { summary: "A" } }] }),
        { status: 200 },
      );
    }) as typeof fetch;
    const issues = await createJiraClient(okFetch).search({
      siteUrl: "https://ex.atlassian.net",
      email: "a@b.c",
      token: "t",
      jql: "x",
    });
    expect(issues[0]?.key).toBe("PROJ-1");
    expect(sleeps).toEqual([2_000]);

    setSleepForTests(async () => undefined);
    const always429 = (async () => new Response("", { status: 429, headers: { "Retry-After": "3" } })) as typeof fetch;
    await expect(
      createJiraClient(always429).test("https://ex.atlassian.net", "a@b.c", "t"),
    ).rejects.toThrow("Jira is rate limiting, retrying in 3s");
  });
});
