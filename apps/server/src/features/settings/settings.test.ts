import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { getSettings, patchSettings } from "./index.ts";

describe("settings", () => {
  beforeEach(() => {
    resetDbForTests(join(mkdtempSync(join(tmpdir(), "fd-")), "app.sqlite"));
  });
  afterEach(() => closeDb());

  it("defaults caps and concurrency", () => {
    const s = getSettings();
    expect(s.dollarCapUsd).toBe(10);
    expect(s.dailyDollarCapUsd).toBe(50);
    expect(s.maxConcurrentAgents).toBe(3);
  });

  it("patches jira fields", () => {
    const s = patchSettings({ jiraSiteUrl: "https://ex.atlassian.net", jiraEmail: "d@x.com", jiraConfigured: true });
    expect(s.jiraConfigured).toBe(true);
    expect(getSettings().jiraEmail).toBe("d@x.com");
  });
});
