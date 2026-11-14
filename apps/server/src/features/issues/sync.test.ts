import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TTL } from "../cache/index.ts";
import { resetCacheForTests } from "../cache/store.ts";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { subscribe } from "../events/index.ts";
import type { GithubClient, GhIssue } from "../github/index.ts";
import type { JiraClient } from "../jira/index.ts";
import { patchSettings } from "../settings/index.ts";
import { listIssues, syncIssues, type IssuesDeps } from "./index.ts";

describe("issues sync TTL", () => {
  let now = 0;

  beforeEach(() => {
    now = 0;
    resetCacheForTests({ now: () => now });
    resetDbForTests(join(mkdtempSync(join(tmpdir(), "fd-")), "app.sqlite"));
    delete process.env.FLIGHTDECK_DEMO;
    patchSettings({
      jiraSiteUrl: "https://ex.atlassian.net",
      jiraEmail: "a@b.c",
      jiraConfigured: true,
    });
  });
  afterEach(() => closeDb());

  it("GET within TTL does not call GitHub or Jira and does not publish", async () => {
    const { deps, calls } = mocks();
    const published = trackPublishes();
    const first = await listIssues(deps);
    expect(first.map((i) => i.key)).toEqual(["acme/web#1", "PROJ-1"]);
    expect(calls).toEqual({ status: 1, issues: 1, search: 1 });
    expect(published()).toBe(1);

    await listIssues(deps);
    expect(calls).toEqual({ status: 1, issues: 1, search: 1 });
    expect(published()).toBe(1);
  });

  it("POST /sync forces a tracker round-trip", async () => {
    const { deps, calls } = mocks();
    await listIssues(deps);
    await syncIssues(deps);
    expect(calls).toEqual({ status: 2, issues: 2, search: 2 });
  });

  it("issues.updated handler GET does not re-sync", async () => {
    const { deps, calls } = mocks();
    const pending: Promise<unknown>[] = [];
    const unsub = subscribe((ev) => {
      if (ev.type === "issues.updated") pending.push(listIssues(deps));
    });
    await listIssues(deps);
    await Promise.all(pending);
    unsub();
    expect(calls).toEqual({ status: 1, issues: 1, search: 1 });
  });

  it("GET after TTL expiry syncs again", async () => {
    const { deps, calls } = mocks();
    await listIssues(deps);
    now = TTL.issuesSync + 1;
    await listIssues(deps);
    expect(calls.issues).toBe(2);
    expect(calls.search).toBe(2);
  });
});

function trackPublishes(): () => number {
  let n = 0;
  subscribe((ev) => {
    if (ev.type === "issues.updated") n += 1;
  });
  return () => n;
}

function mocks(): { deps: IssuesDeps; calls: { status: number; issues: number; search: number } } {
  const calls = { status: 0, issues: 0, search: 0 };
  const issue: GhIssue = {
    id: "github:acme/web#1",
    number: 1,
    title: "T",
    body: "",
    url: "https://github.com/acme/web/issues/1",
    updatedAt: "2026-11-12T00:00:00Z",
    owner: "acme",
    name: "web",
  };
  const github = {
    status: async () => {
      calls.status += 1;
      return { installed: true, loggedIn: true, user: "dan", detail: "ok" };
    },
    listAssignedIssues: async () => {
      calls.issues += 1;
      return [issue];
    },
    listRepos: async () => [],
    cloneRepo: async () => ({ ok: true, detail: "" }),
    createIssue: async () => ({ number: 1, url: issue.url }),
    updateIssue: async () => undefined,
  } satisfies GithubClient;
  const jira = {
    test: async () => ({ ok: true, detail: "ok" }),
    search: async () => {
      calls.search += 1;
      return [
        {
          key: "PROJ-1",
          title: "J",
          body: "",
          url: "https://ex.atlassian.net/browse/PROJ-1",
          updatedAt: "2026-11-12T00:00:00Z",
        },
      ];
    },
    createIssue: async () => ({ key: "PROJ-1", url: "" }),
    updateIssue: async () => undefined,
  } satisfies JiraClient;
  return { deps: { github, jira, token: async () => "t" }, calls };
}
