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
});
