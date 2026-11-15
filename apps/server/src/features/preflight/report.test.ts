import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CACHE_KEYS, getCache } from "../cache/index.ts";
import { resetCacheForTests } from "../cache/store.ts";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { formatPreflight } from "./print.ts";
import { getPreflightReport, preflightBuildCount, recheckPreflight, resetPreflightStore, runChecks } from "./report.ts";
import { resetDemoPreflightFixture, setDemoPreflightFixture } from "./demo.ts";

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
    process.env.GITHUB_TOKEN = "test-env-github-token";
    setDemoPreflightFixture("fail");
    const report = await runChecks();
    expect(report.ok).toBe(false);
    const github = report.checks.find((c) => c.id === "github");
    expect(github?.fix).toBe("Add a GitHub token in Settings");
    expect(github?.detail).toBe("GitHub token from GITHUB_TOKEN was rejected");
    expect(github?.detail).not.toMatch(/No GitHub token stored/);
    expect(github?.detail).not.toMatch(/Using GITHUB_TOKEN from environment/);
    expect(formatPreflight(report)).toContain("Fix: brew install git");
    expect(formatPreflight(report)).toContain("Required checks failed");
  });

  it("GET never increments the build count", async () => {
    expect(getPreflightReport()).toBeUndefined();
    expect(preflightBuildCount()).toBe(0);
    await runChecks();
    expect(preflightBuildCount()).toBe(1);
    const first = getPreflightReport();
    const second = getPreflightReport();
    expect(second?.checkedAt).toBe(first?.checkedAt);
    expect(preflightBuildCount()).toBe(1);
    await new Promise((r) => setTimeout(r, 5));
    const fresh = await recheckPreflight();
    expect(fresh.checkedAt).not.toBe(first?.checkedAt);
    expect(preflightBuildCount()).toBe(2);
    expect(getPreflightReport()?.checkedAt).toBe(fresh.checkedAt);
    expect(preflightBuildCount()).toBe(2);
  });

  it("invalidates GitHub and Claude caches on recheck", async () => {
    const cache = getCache();
    let gh = 0;
    let claude = 0;
    await cache.get(CACHE_KEYS.githubStatus, async () => ++gh, 60_000);
    await cache.get(CACHE_KEYS.claudeConfig, async () => ++claude, 60_000);
    await runChecks();
    await cache.get(CACHE_KEYS.githubStatus, async () => ++gh, 60_000);
    await cache.get(CACHE_KEYS.claudeConfig, async () => ++claude, 60_000);
    expect(gh).toBe(2);
    expect(claude).toBe(2);
  });

});
