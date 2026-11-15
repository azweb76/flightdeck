import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { saveGithubToken } from "./client.ts";
import { clearEtags, etagHit, rememberEtag, rememberedEtag } from "./etag.ts";

describe("etag memory", () => {
  beforeEach(() => {
    clearEtags();
    process.env.FLIGHTDECK_DATA_DIR = mkdtempSync(join(tmpdir(), "fd-etag-"));
    resetDbForTests(join(process.env.FLIGHTDECK_DATA_DIR, "app.sqlite"));
  });

  afterEach(() => {
    clearEtags();
    closeDb();
    delete process.env.FLIGHTDECK_DATA_DIR;
  });

  it("clears remembered ETags when the GitHub token is saved", async () => {
    rememberEtag("gh:pull:acme/web#9", 'W/"p1"', { state: "open" });
    expect(rememberedEtag("gh:pull:acme/web#9")).toBe('W/"p1"');
    await saveGithubToken("ghp_test_reconnect");
    expect(rememberedEtag("gh:pull:acme/web#9")).toBeUndefined();
    expect(etagHit("gh:pull:acme/web#9")).toBeUndefined();
  });
});
