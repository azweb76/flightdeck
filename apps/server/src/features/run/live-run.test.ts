import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setAgentDriver } from "../agent/index.ts";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { patchSettings } from "../settings/index.ts";
import { runLive } from "./live-run.ts";
import { getChange, insertChange } from "./store.ts";

describe("live run cap abort", () => {
  beforeEach(() => {
    delete process.env.FLIGHTDECK_DEMO;
    const dir = mkdtempSync(join(tmpdir(), "fd-live-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    resetDbForTests(join(dir, "app.sqlite"));
    patchSettings({ dollarCapUsd: 1, dailyDollarCapUsd: 50 });
  });

  afterEach(() => {
    setAgentDriver(undefined);
    closeDb();
    delete process.env.FLIGHTDECK_DATA_DIR;
  });

  it("aborts the SDK query when a usage event hits the cap", async () => {
    let extra = 0;
    setAgentDriver({
      async *run(opts) {
        yield { kind: "usage", title: "usage", costUsd: 5 };
        if (opts.abort?.aborted) return;
        extra += 1;
        yield { kind: "text", title: "assistant", detail: "should not keep going" };
      },
    });
    const change = insertChange(
      {
        id: "github:acme/web#1",
        source: "github",
        key: "acme/web#1",
        title: "Live cap",
        body: "body",
        url: "",
        repoSlug: "acme/web",
        updatedAt: new Date().toISOString(),
        saved: true,
      },
      "live",
      "/tmp/none",
      "flightdeck/test",
      "planning",
    );
    await runLive(change);
    expect(getChange(change.id)?.status).toBe("cap_hit");
    expect(extra).toBe(0);
    expect(getChange(change.id)?.events.some((e) => e.title === "cap")).toBe(true);
  });
});
