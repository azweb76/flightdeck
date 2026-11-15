import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { rememberRepo } from "../clone/index.ts";
import { setFavorite, touchRecent } from "../catalog/stars.ts";
import { closeDb, getDb, resetDbForTests } from "../db/index.ts";
import { loadIssues, upsertIssue } from "../issues/store.ts";
import { resetPreflightStore, runChecks } from "../preflight/index.ts";
import { startChange, waitForChange } from "../run/index.ts";
import { listChanges } from "../run/store.ts";
import { getSettings, patchSettings } from "../settings/index.ts";
import { replyShape, saveShapedIssue, startShape } from "../shape/index.ts";
import { DEMO_ISSUE_IDS, purgeLiveDemoRows } from "./purge.ts";
import { seedIssues } from "./seed-issues.ts";
import { DEMO_JIRA_EMAIL, DEMO_JIRA_SITE } from "./seed-jira.ts";

describe("purgeLiveDemoRows", () => {
  beforeEach(() => {
    resetDbForTests(join(mkdtempSync(join(tmpdir(), "fd-purge-")), "app.sqlite"));
    delete process.env.FLIGHTDECK_DEMO;
  });
  afterEach(() => closeDb());

  it("drops leftover matching seeds but keeps real rows with the same ids", () => {
    for (const issue of seedIssues()) upsertIssue({ ...issue, demo: false });
    upsertIssue({
      id: "jira:PROJ-150",
      source: "jira",
      key: "PROJ-150",
      title: "Live finance ticket",
      body: "real",
      url: "https://corp.atlassian.net/browse/PROJ-150",
      updatedAt: "2026-11-14T00:00:00Z",
      saved: true,
    });
    upsertIssue({
      id: "github:acme/web#12",
      source: "github",
      key: "acme/web#12",
      title: "Live GitHub bug",
      body: "real",
      url: "https://github.com/acme/web/issues/12",
      repoSlug: "acme/web",
      updatedAt: "2026-11-14T00:00:00Z",
      saved: true,
    });
    rememberRepo("acme", "web", "/tmp/flightdeck-demo/acme/web", false);
    rememberRepo("dan", "app", "/Users/dan/src/app", false);

    purgeLiveDemoRows();

    expect(loadIssues().map((i) => i.id).sort()).toEqual(["github:acme/web#12", "jira:PROJ-150"]);
    expect(loadIssues().find((i) => i.id === "jira:PROJ-150")?.title).toBe("Live finance ticket");
    expect(DEMO_ISSUE_IDS.length).toBeGreaterThan(0);
    const repos = getDb().prepare("SELECT owner, name FROM repos").all() as { owner: string; name: string }[];
    expect(repos).toEqual([{ owner: "dan", name: "app" }]);
  });

  it("clears demo save, session, run, and clone after leaving demo mode", async () => {
    process.env.FLIGHTDECK_DEMO = "1";
    resetPreflightStore();
    await runChecks();
    const session = await startShape({ repoSlug: "acme/web", idea: "CSV export" });
    await replyShape(session.id, "Backend API");
    await saveShapedIssue(session.id, "github", { repoSlug: "acme/web" });
    const change = await startChange("github:acme/web#201");
    await waitForChange(change.id);
    expect(loadIssues().some((i) => i.id === "github:acme/web#201" && i.demo)).toBe(true);
    expect(listChanges().length).toBeGreaterThan(0);

    delete process.env.FLIGHTDECK_DEMO;
    purgeLiveDemoRows();

    expect(loadIssues()).toEqual([]);
    expect(listChanges()).toEqual([]);
    const sessions = getDb().prepare("SELECT id FROM shape_sessions").all();
    expect(sessions).toEqual([]);
    const repos = getDb().prepare("SELECT owner, name FROM repos").all();
    expect(repos).toEqual([]);
  });

  it("clears leftover demo Jira settings and keeps real Jira settings", () => {
    patchSettings({
      jiraSiteUrl: DEMO_JIRA_SITE,
      jiraEmail: DEMO_JIRA_EMAIL,
      jiraConfigured: true,
      theme: "dark",
      jiraProjectKey: "KEEP",
    });
    purgeLiveDemoRows();
    expect(getSettings()).toMatchObject({
      jiraSiteUrl: "",
      jiraEmail: "",
      jiraConfigured: false,
      theme: "dark",
      jiraProjectKey: "KEEP",
    });

    patchSettings({
      jiraSiteUrl: "https://corp.atlassian.net",
      jiraEmail: "dan@corp.com",
      jiraConfigured: true,
      jiraProjectKey: "FIN",
    });
    purgeLiveDemoRows();
    expect(getSettings()).toMatchObject({
      jiraSiteUrl: "https://corp.atlassian.net",
      jiraEmail: "dan@corp.com",
      jiraConfigured: true,
      jiraProjectKey: "FIN",
    });
  });

  it("purges demo favorites/recent and leftover slugs without a live repo", () => {
    process.env.FLIGHTDECK_DEMO = "1";
    rememberRepo("acme", "web", "/tmp/flightdeck-demo/acme/web", true);
    setFavorite("acme", "web", true);
    touchRecent("acme/web");
    delete process.env.FLIGHTDECK_DEMO;
    rememberRepo("dan", "app", "/Users/dan/src/app", false);
    setFavorite("dan", "app", true);
    touchRecent("dan/app");
    getDb().prepare("INSERT INTO repo_favorites (owner, name, demo) VALUES ('acme','api',0)").run();
    rememberRepo("acme", "api", "/tmp/flightdeck-demo/acme/api", true);

    purgeLiveDemoRows();

    const fav = getDb().prepare("SELECT owner, name FROM repo_favorites ORDER BY name").all();
    const recent = getDb().prepare("SELECT owner, name FROM repo_recent ORDER BY name").all();
    expect(fav).toEqual([{ owner: "dan", name: "app" }]);
    expect(recent).toEqual([{ owner: "dan", name: "app" }]);
  });

  it("keeps a demo-flagged favorite when a live repo with that slug remains", () => {
    process.env.FLIGHTDECK_DEMO = "1";
    setFavorite("acme", "web", true);
    delete process.env.FLIGHTDECK_DEMO;
    rememberRepo("acme", "web", "/Users/dan/src/web", false);
    rememberRepo("acme", "demo", "/tmp/flightdeck-demo/acme/demo", true);
    purgeLiveDemoRows();
    const fav = getDb().prepare("SELECT owner, name, demo FROM repo_favorites").all();
    expect(fav).toEqual([{ owner: "acme", name: "web", demo: 1 }]);
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
