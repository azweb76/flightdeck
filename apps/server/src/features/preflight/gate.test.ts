import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { assertPreflightGate, PreflightBlockedError } from "./gate.ts";
import { resetDemoPreflightFixture, setDemoPreflightFixture } from "./demo.ts";
import { resetPreflightStore, runChecks } from "./report.ts";

describe("assertPreflightGate", () => {
  beforeEach(() => {
    process.env.FLIGHTDECK_DEMO = "1";
    resetDbForTests(join(mkdtempSync(join(tmpdir(), "fd-gate-")), "app.sqlite"));
    resetDemoPreflightFixture();
    resetPreflightStore();
  });
  afterEach(() => {
    closeDb();
    resetDemoPreflightFixture();
    resetPreflightStore();
    delete process.env.FLIGHTDECK_DEMO;
  });

  it("throws 409 with the failing check", async () => {
    setDemoPreflightFixture("fail");
    await runChecks();
    expect(() => assertPreflightGate("refine")).toThrow(PreflightBlockedError);
    try {
      assertPreflightGate("refine");
    } catch (err) {
      expect(err).toBeInstanceOf(PreflightBlockedError);
      expect((err as PreflightBlockedError).status).toBe(409);
      expect((err as Error).message).toMatch(/git/i);
    }
  });

  it("allows refine when only GitHub failed", async () => {
    setDemoPreflightFixture("github");
    await runChecks();
    expect(() => assertPreflightGate("refine")).not.toThrow();
    expect(() => assertPreflightGate("start")).toThrow(/GitHub/);
  });
});
