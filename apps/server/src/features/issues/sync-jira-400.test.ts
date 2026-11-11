import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { patchSettings } from "../settings/index.ts";
import { listIssues, type IssueDeps } from "./index.ts";

describe("Jira HTTP 400 during assigned sync", () => {
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

  it("keeps Jira actionable and records errorMessages", async () => {
    const mixed = {
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
        search: async () => {
          throw new Error(
            "Jira search failed (400): Error in the JQL Query: Expecting operator but got 'AND'.",
          );
        },
      },
    } as unknown as IssueDeps;
    const result = await listIssues({ refresh: "1" }, mixed);
    expect(result.offline).toBe(false);
    expect(result.offlineSources.jira).toBe(false);
    expect(result.offlineSources.github).toBe(false);
    expect(result.errors.join(" ")).toMatch(/400.*AND/);
    const { isOffline } = await import("./index.ts");
    expect(isOffline("jira")).toBe(false);
  });
});
