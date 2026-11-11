import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TeamConfigSchema } from "@flightdeck/shared";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { listRepos } from "../repos/index.ts";
import { getDeferredTeamConfig, getSettings } from "../settings/index.ts";
import { applyTeamConfig, parseTeamConfig } from "./import-config.ts";

describe("team config import", () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "flightdeck-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    resetDbForTests(join(dir, "app.sqlite"));
  });
  afterEach(() => {
    closeDb();
    delete process.env.FLIGHTDECK_DATA_DIR;
  });

  it("stores Phase 1 fields and keeps prompts/models for later", () => {
    const config = parseTeamConfig({
      version: 1,
      repos: [{ owner: "acme", name: "web", pinned: true }],
      labelRules: { prefix: "repo:" },
      prompts: { refiner: "clarify" },
      models: { planner: "opus" },
      jira: { siteUrl: "https://acme.atlassian.net", jql: "assignee = currentUser()" },
    });
    expect(TeamConfigSchema.safeParse(config).success).toBe(true);
    const result = applyTeamConfig(config);
    expect(result.reposAdded).toBe(1);
    expect(listRepos()[0]).toMatchObject({ owner: "acme", name: "web", pinned: true });
    expect(getSettings().labelPrefix).toBe("repo:");
    expect(getSettings().jiraSiteUrl).toBe("https://acme.atlassian.net");
    expect(getDeferredTeamConfig()).toMatchObject({
      prompts: { refiner: "clarify" },
      models: { planner: "opus" },
    });
  });
});
