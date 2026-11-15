import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { seedDemo } from "./index.ts";
import { presentChange } from "../run/view.ts";
import { listChanges } from "../run/store.ts";

describe("demo run seeds", () => {
  beforeEach(() => {
    process.env.FLIGHTDECK_DEMO = "1";
    resetDbForTests(join(mkdtempSync(join(tmpdir(), "fd-seed-runs-")), "app.sqlite"));
    seedDemo();
  });

  afterEach(() => {
    closeDb();
    delete process.env.FLIGHTDECK_DEMO;
  });

  it("holds a job on the reviewing seed so it is not Interrupted", () => {
    const reviewing = listChanges().find((c) => c.issueKey === "acme/web#45");
    expect(reviewing?.status).toBe("reviewing");
    expect(presentChange(reviewing!).interrupted).toBe(false);
    const interrupted = listChanges().find((c) => c.issueKey === "acme/web#41");
    expect(presentChange(interrupted!).interrupted).toBe(true);
  });
});
