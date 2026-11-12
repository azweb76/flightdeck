import { describe, expect, it } from "vitest";
import { markdownToAdf } from "@flightdeck/shared";
import { createJiraClient } from "./index.ts";
import { jiraSearchJql } from "./jql.ts";

describe("jira adapter", () => {
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
});
