import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, getDb, resetDbForTests } from "../db/index.ts";
import { seedDemo } from "../demo/index.ts";
import { purgeLiveDemoRows } from "../demo/purge.ts";
import { getMyPull, listMyPulls } from "./index.ts";

describe("demo My PRs", () => {
  beforeEach(() => {
    process.env.FLIGHTDECK_DEMO = "1";
    resetDbForTests(join(mkdtempSync(join(tmpdir(), "fd-prs-")), "app.sqlite"));
    seedDemo();
  });

  afterEach(() => {
    closeDb();
    delete process.env.FLIGHTDECK_DEMO;
  });

  it("seeds mixed CI and review states only in demo mode", async () => {
    const all = await listMyPulls("all");
    expect(all.map((p) => p.number).sort()).toEqual([80, 81, 82, 83, 84]);
    expect(all.find((p) => p.number === 80)?.ci).toBe("passing");
    expect(all.find((p) => p.number === 81)?.ci).toBe("failing");
    expect(all.find((p) => p.number === 82)?.ciRound).toBe(2);
    expect(all.find((p) => p.number === 82)?.needsYou).toBe(false);
    expect(all.find((p) => p.number === 83)?.ciRound).toBe(3);
    expect(all.find((p) => p.number === 83)?.needsYou).toBe(true);
    expect(all.find((p) => p.number === 84)?.review).toBe("changes_requested");
    expect((await listMyPulls("needs_you")).every((p) => p.needsYou)).toBe(true);
    expect((await listMyPulls("draft")).every((p) => p.draft)).toBe(true);
    const one = await getMyPull("acme", "web", 82);
    expect(one?.title).toMatch(/Auto-fixing/);
  });

  it("purge drops demo pulls when leaving demo mode", () => {
    delete process.env.FLIGHTDECK_DEMO;
    purgeLiveDemoRows();
    const n = (getDb().prepare("SELECT COUNT(*) AS n FROM pull_requests").get() as { n: number }).n;
    expect(n).toBe(0);
  });
});
