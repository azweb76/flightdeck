import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { rememberRepo } from "../clone/index.ts";
import { closeDb, getDb, resetDbForTests } from "../db/index.ts";
import { loadIssues, upsertIssue } from "../issues/store.ts";
import { DEMO_ISSUE_IDS, purgeLiveDemoRows } from "./purge.ts";
import { seedIssues } from "./seed-issues.ts";

describe("purgeLiveDemoRows", () => {
  beforeEach(() => {
    resetDbForTests(join(mkdtempSync(join(tmpdir(), "fd-purge-")), "app.sqlite"));
    delete process.env.FLIGHTDECK_DEMO;
  });
  afterEach(() => closeDb());

  it("drops leftover demo seeds and demo-path repos but keeps real rows", () => {
    for (const issue of seedIssues()) upsertIssue({ ...issue, demo: false });
    upsertIssue({
      id: "jira:REAL-1",
      source: "jira",
      key: "REAL-1",
      title: "Production bug",
      body: "",
      url: "https://ex.atlassian.net/browse/REAL-1",
      updatedAt: "2026-11-14T00:00:00Z",
      saved: true,
    });
    rememberRepo("acme", "web", "/tmp/flightdeck-demo/acme/web", false);
    rememberRepo("dan", "app", "/Users/dan/src/app", false);

    purgeLiveDemoRows();

    expect(loadIssues().map((i) => i.id)).toEqual(["jira:REAL-1"]);
    expect(DEMO_ISSUE_IDS.length).toBeGreaterThan(0);
    const repos = getDb().prepare("SELECT owner, name FROM repos").all() as { owner: string; name: string }[];
    expect(repos).toEqual([{ owner: "dan", name: "app" }]);
  });

  it("does nothing while demo mode is on", () => {
    process.env.FLIGHTDECK_DEMO = "1";
    const seeded = seedIssues()[0];
    if (!seeded) throw new Error("missing seed");
    upsertIssue({ ...seeded, demo: true });
    purgeLiveDemoRows();
    expect(loadIssues()).toHaveLength(1);
  });
});
