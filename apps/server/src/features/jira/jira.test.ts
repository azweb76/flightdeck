import { describe, expect, it } from "vitest";
import { createJiraClient } from "./index.ts";

describe("createJiraClient.createIssue", () => {
  it("POSTs a Task to the Jira project", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchFn = (async (url: string | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ key: "PROJ-9" }), { status: 201 });
    }) as typeof fetch;
    const client = createJiraClient(fetchFn);
    const created = await client.createIssue({
      siteUrl: "https://ex.atlassian.net",
      email: "a@b.c",
      token: "t",
      projectKey: "PROJ",
      title: "New",
      body: "Body",
    });
    expect(created.key).toBe("PROJ-9");
    expect(calls[0]?.url).toContain("/rest/api/3/issue");
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse(String(calls[0]?.init?.body)) as { fields: { project: { key: string } } };
    expect(body.fields.project.key).toBe("PROJ");
  });
});
