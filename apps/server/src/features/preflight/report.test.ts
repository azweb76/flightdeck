import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetCacheForTests } from "../cache/store.ts";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { formatPreflight } from "./print.ts";
import { getPreflightReport, patchGithubPreflight, preflightBuildCount, recheckPreflight, resetPreflightStore, runChecks } from "./report.ts";
import { resetDemoPreflightFixture, setDemoPreflightFixture } from "./demo.ts";
import { demoGithubStatus, setDemoGithubMode } from "../github/demo.ts";

describe("preflight report", () => {
  beforeEach(() => {
    process.env.FLIGHTDECK_DEMO = "1";
    delete process.env.FLIGHTDECK_PREFLIGHT;
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
    resetDemoPreflightFixture();
    resetPreflightStore();
    resetCacheForTests();
    resetDbForTests(join(mkdtempSync(join(tmpdir(), "pf-db-")), "app.sqlite"));
  });
  afterEach(() => {
    closeDb();
    resetDemoPreflightFixture();
    resetPreflightStore();
    delete process.env.FLIGHTDECK_DEMO;
    delete process.env.FLIGHTDECK_PREFLIGHT;
    delete process.env.GITHUB_TOKEN;
  });

  it("fakes all checks passing in demo mode", async () => {
    const report = await runChecks();
    expect(report.ok).toBe(true);
    expect(report.demo).toBe(true);
    expect(report.checks.every((c) => c.ok)).toBe(true);
  });

  it("can show a failing demo fixture for screenshots", async () => {
    setDemoPreflightFixture("fail");
    const report = await runChecks();
    expect(report.ok).toBe(false);
    expect(report.checks.find((c) => c.id === "github")?.fix).toBe("Add a GitHub token in Settings");
    expect(formatPreflight(report)).toContain("Fix: brew install git");
    expect(formatPreflight(report)).toContain("Required checks failed");
  });

  it("GET returns the stored snapshot and never rebuilds", async () => {
    await runChecks();
    expect(preflightBuildCount()).toBe(1);
    const first = await getPreflightReport();
    const second = await getPreflightReport();
    expect(second.checkedAt).toBe(first.checkedAt);
    expect(preflightBuildCount()).toBe(1);
    await new Promise((r) => setTimeout(r, 5));
    const fresh = await recheckPreflight();
    expect(fresh.checkedAt).not.toBe(first.checkedAt);
    expect(preflightBuildCount()).toBe(2);
    expect((await getPreflightReport()).checkedAt).toBe(fresh.checkedAt);
    expect(preflightBuildCount()).toBe(2);
  });

  it("patches only the GitHub row when the token source changes", async () => {
    process.env.GITHUB_TOKEN = "test-env-github-token";
    await runChecks();
    expect(preflightBuildCount()).toBe(1);
    expect((await getPreflightReport()).checks.find((c) => c.id === "github")?.detail).toContain(
      "Using GITHUB_TOKEN from environment",
    );
    setDemoGithubMode("empty");
    const patched = patchGithubPreflight(demoGithubStatus());
    expect(preflightBuildCount()).toBe(1);
    const github = patched.checks.find((c) => c.id === "github");
    expect(github?.ok).toBe(false);
    expect(github?.detail).toContain("Using GITHUB_TOKEN from environment");
    expect(patched.checks.find((c) => c.id === "git")?.ok).toBe(true);
  });
});
