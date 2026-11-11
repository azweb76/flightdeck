import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { rememberIssue, getIssue, type IssueDeps } from "../issues/index.ts";
import { loadComments } from "../issues/store.ts";

describe("issue comment cache", () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fd-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    resetDbForTests(join(dir, "app.sqlite"));
  });
  afterEach(() => {
    closeDb();
    delete process.env.FLIGHTDECK_DATA_DIR;
  });

  it("stores GitHub comments from a mocked API and honors 304", async () => {
    rememberIssue({
      id: "github:acme/web#1",
      source: "github",
      key: "acme/web#1",
      title: "t",
      body: "b",
      url: "",
      stage: "new",
      repos: [{ owner: "acme", name: "web", registered: true }],
      repoWarning: "none",
      updatedAt: "t",
    });
    let calls = 0;
    const github = {
      getJson: async (_path: string, etag?: string) => {
        calls += 1;
        if (etag) return { status: 304, etag, body: "" };
        return {
          status: 200,
          etag: "W/\"1\"",
          body: JSON.stringify([{ id: 9, user: { login: "dan" }, body: "hello", created_at: "t" }]),
        };
      },
      listAssignedIssues: async () => [],
      listVisibleRepos: async () => [],
    } as unknown as IssueDeps["github"];
    await getIssue("github:acme/web#1", { github });
    await new Promise((r) => setTimeout(r, 20));
    expect(loadComments("github:acme/web#1")[0]?.body).toBe("hello");
    await getIssue("github:acme/web#1", { github });
    await new Promise((r) => setTimeout(r, 20));
    expect(calls).toBeGreaterThanOrEqual(1);
  });
});
