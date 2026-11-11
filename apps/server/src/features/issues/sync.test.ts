import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { patchSettings } from "../settings/index.ts";
import { listIssues, type IssueDeps } from "./index.ts";
import { loadIssues } from "./store.ts";

function deps(): IssueDeps {
  return {
    github: {
      listAssignedIssues: async () => [
        {
          number: 1,
          title: "Assigned GH",
          body: "",
          url: "https://github.com/acme/web/issues/1",
          updatedAt: "2026-11-11T00:00:00Z",
          owner: "acme",
          name: "web",
        },
      ],
      listVisibleRepos: async () => [{ owner: "acme", name: "web" }],
      getJson: async () => ({ status: 200, body: "[]" }),
    } as unknown as IssueDeps["github"],
    jira: {
      search: async () => [
        {
          key: "PROJ-9",
          title: "Assigned Jira",
          body: "",
          url: "https://ex/browse/PROJ-9",
          labels: ["gh:acme/web"],
          updatedAt: "2026-11-11T00:00:00Z",
        },
      ],
    } as unknown as IssueDeps["jira"],
  };
}

describe("assigned issue sync", () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fd-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    resetDbForTests(join(dir, "app.sqlite"));
    patchSettings({ jiraSiteUrl: "https://ex.atlassian.net", jiraEmail: "a@b.c" });
    process.env.FLIGHTDECK_DEMO = "0";
  });
  afterEach(() => {
    closeDb();
    delete process.env.FLIGHTDECK_DEMO;
    delete process.env.FLIGHTDECK_DATA_DIR;
  });

  it("lists only assigned Jira and GitHub issues from mocked clients", async () => {
    const result = await listIssues({ refresh: "1" }, deps());
    expect(result.issues.map((i) => i.key).sort()).toEqual(["PROJ-9", "acme/web#1"]);
    expect(result.fromCache).toBe(false);
    expect(loadIssues()).toHaveLength(2);
  });

  it("returns the cache instantly on a later list", async () => {
    await listIssues({ refresh: "1" }, deps());
    const second = await listIssues({}, deps());
    expect(second.fromCache).toBe(true);
    expect(second.issues.length).toBe(2);
  });

  it("does not prune stale assigned issues on a since-filtered refresh", async () => {
    const gh = {
      listAssignedIssues: async (since?: string) =>
        since
          ? [
              {
                number: 1,
                title: "Updated",
                body: "",
                url: "https://github.com/acme/web/issues/1",
                updatedAt: "2026-11-11T01:00:00Z",
                owner: "acme",
                name: "web",
              },
            ]
          : [
              {
                number: 1,
                title: "Assigned GH",
                body: "",
                url: "https://github.com/acme/web/issues/1",
                updatedAt: "2026-11-11T00:00:00Z",
                owner: "acme",
                name: "web",
              },
              {
                number: 2,
                title: "Older assigned",
                body: "",
                url: "https://github.com/acme/web/issues/2",
                updatedAt: "2026-11-10T00:00:00Z",
                owner: "acme",
                name: "web",
              },
            ],
      listVisibleRepos: async () => [{ owner: "acme", name: "web" }],
      getJson: async () => ({ status: 200, body: "[]" }),
    };
    const jira = {
      search: async (opts: { jql: string }) =>
        opts.jql.includes("updated >=")
          ? []
          : [
              {
                key: "PROJ-9",
                title: "Assigned Jira",
                body: "",
                url: "https://ex/browse/PROJ-9",
                labels: ["gh:acme/web"],
                updatedAt: "2026-11-11T00:00:00Z",
              },
            ],
    };
    const d = { github: gh, jira } as unknown as IssueDeps;
    await listIssues({ refresh: "1" }, d);
    expect(loadIssues()).toHaveLength(3);
    const { syncAssigned } = await import("./index.ts");
    await syncAssigned({}, d, false);
    expect(loadIssues().map((i) => i.key).sort()).toEqual(["PROJ-9", "acme/web#1", "acme/web#2"]);
  });

  it("uses Settings JQL and marks offline when APIs fail, including cached lists", async () => {
    patchSettings({ jiraJql: "assignee = currentUser() AND labels = ship" });
    let seenJql = "";
    const ok = {
      github: {
        listAssignedIssues: async () => [
          {
            number: 1,
            title: "Assigned GH",
            body: "",
            url: "https://github.com/acme/web/issues/1",
            updatedAt: "2026-11-11T00:00:00Z",
            owner: "acme",
            name: "web",
          },
        ],
        listVisibleRepos: async () => [{ owner: "acme", name: "web" }],
        getJson: async () => ({ status: 200, body: "[]" }),
      },
      jira: {
        search: async (opts: { jql: string }) => {
          seenJql = opts.jql;
          return [
            {
              key: "PROJ-9",
              title: "Assigned Jira",
              body: "",
              url: "https://ex/browse/PROJ-9",
              labels: ["gh:acme/web"],
              updatedAt: "2026-11-11T00:00:00Z",
            },
          ];
        },
      },
    } as unknown as IssueDeps;
    await listIssues({ refresh: "1" }, ok);
    expect(seenJql).toContain("labels = ship");
    const failing = {
      github: {
        listAssignedIssues: async () => {
          throw new Error("ENOTFOUND");
        },
        listVisibleRepos: async () => {
          throw new Error("ENOTFOUND");
        },
        getJson: async () => ({ status: 500, body: "" }),
      },
      jira: {
        search: async () => {
          throw new Error("network");
        },
      },
    } as unknown as IssueDeps;
    const { syncAssigned, isOffline } = await import("./index.ts");
    const live = await syncAssigned({}, failing, false);
    expect(live.offline).toBe(true);
    expect(isOffline()).toBe(true);
    const cached = await listIssues({}, failing);
    expect(cached.fromCache).toBe(true);
    expect(cached.offline).toBe(true);
  });

  it("does not mark the whole app offline when only GitHub fails", async () => {
    const mixed = {
      github: {
        listAssignedIssues: async () => {
          throw new Error("ENOTFOUND");
        },
        listVisibleRepos: async () => [{ owner: "acme", name: "web" }],
        getJson: async () => ({ status: 200, body: "[]" }),
      },
      jira: {
        search: async () => [
          {
            key: "PROJ-9",
            title: "Assigned Jira",
            body: "",
            url: "https://ex/browse/PROJ-9",
            labels: ["gh:acme/web"],
            updatedAt: "2026-11-11T00:00:00Z",
          },
        ],
      },
    } as unknown as IssueDeps;
    const result = await listIssues({ refresh: "1" }, mixed);
    expect(result.offline).toBe(false);
    expect(result.offlineSources.github).toBe(true);
    expect(result.offlineSources.jira).toBe(false);
    expect(result.issues.some((i) => i.key === "PROJ-9")).toBe(true);
  });

  it("keeps an unlabeled Jira chip pick across a full Refresh", async () => {
    const unlabeled = {
      github: {
        listAssignedIssues: async () => [],
        listVisibleRepos: async () => [
          { owner: "acme", name: "web" },
          { owner: "acme", name: "api" },
        ],
        getJson: async () => ({ status: 200, body: "[]" }),
      },
      jira: {
        search: async () => [
          {
            key: "PROJ-1",
            title: "No labels",
            body: "",
            url: "https://ex/browse/PROJ-1",
            labels: ["bug"],
            updatedAt: "2026-11-11T00:00:00Z",
          },
        ],
      },
    } as unknown as IssueDeps;
    const first = await listIssues({ refresh: "1" }, unlabeled);
    expect(first.issues[0]?.repoWarning).toBe("missing");
    const { rememberIssuePick } = await import("../discovery/index.ts");
    rememberIssuePick("jira:PROJ-1", "acme", "web");
    const again = await listIssues({ refresh: "1" }, unlabeled);
    expect(again.issues[0]?.repos).toEqual([
      expect.objectContaining({ owner: "acme", name: "web", registered: true }),
    ]);
    expect(again.issues[0]?.repoWarning).toBe("none");
  });

  it("filters the board by source after overlay", async () => {
    await listIssues({ refresh: "1" }, deps());
    const jira = await listIssues({ source: "jira" }, deps());
    const github = await listIssues({ source: "github" }, deps());
    expect(jira.issues.every((i) => i.source === "jira")).toBe(true);
    expect(github.issues.every((i) => i.source === "github")).toBe(true);
    expect(jira.issues.length).toBeGreaterThan(0);
    expect(github.issues.length).toBeGreaterThan(0);
  });
});
