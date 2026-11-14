import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetCacheForTests } from "../cache/store.ts";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { formatPreflight } from "./print.ts";
import { getPreflightReport } from "./report.ts";
import { resetDemoPreflightFixture, setDemoPreflightFixture } from "./demo.ts";

describe("preflight report", () => {
  beforeEach(() => {
    process.env.FLIGHTDECK_DEMO = "1";
    delete process.env.FLIGHTDECK_PREFLIGHT;
    resetDemoPreflightFixture();
    resetCacheForTests();
    resetDbForTests(join(mkdtempSync(join(tmpdir(), "pf-db-")), "app.sqlite"));
  });
  afterEach(() => {
    closeDb();
    resetDemoPreflightFixture();
    delete process.env.FLIGHTDECK_DEMO;
    delete process.env.FLIGHTDECK_PREFLIGHT;
  });

  it("fakes all checks passing in demo mode", async () => {
    const report = await getPreflightReport({ force: true });
    expect(report.ok).toBe(true);
    expect(report.demo).toBe(true);
    expect(report.checks.every((c) => c.ok)).toBe(true);
  });

  it("can show a failing demo fixture for screenshots", async () => {
    setDemoPreflightFixture("fail");
    const report = await getPreflightReport({ force: true });
    expect(report.ok).toBe(false);
    expect(report.checks.find((c) => c.id === "github")?.fix).toBe("Add a GitHub token in Settings");
    expect(formatPreflight(report)).toContain("Fix: brew install git");
    expect(formatPreflight(report)).toContain("Required checks failed");
  });

  it("caches the report until refresh", async () => {
    const first = await getPreflightReport();
    const cached = await getPreflightReport();
    expect(cached.checkedAt).toBe(first.checkedAt);
    await new Promise((r) => setTimeout(r, 5));
    const fresh = await getPreflightReport({ force: true });
    expect(fresh.checkedAt).not.toBe(first.checkedAt);
  });
});
