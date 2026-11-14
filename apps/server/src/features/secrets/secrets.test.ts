import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GITHUB_TOKEN_ACCOUNT, createSecretStore } from "./index.ts";

describe("secret store", () => {
  const prev = process.env.FLIGHTDECK_DATA_DIR;

  beforeEach(() => {
    process.env.FLIGHTDECK_DATA_DIR = mkdtempSync(join(tmpdir(), "fd-sec-"));
  });
  afterEach(async () => {
    await createSecretStore().remove(GITHUB_TOKEN_ACCOUNT);
    if (prev) process.env.FLIGHTDECK_DATA_DIR = prev;
    else delete process.env.FLIGHTDECK_DATA_DIR;
  });

  it("round-trips a GitHub token without putting it in the data dir name", async () => {
    const store = createSecretStore();
    await store.set("ghp_test_token", GITHUB_TOKEN_ACCOUNT);
    expect(await store.get(GITHUB_TOKEN_ACCOUNT)).toBe("ghp_test_token");
    expect(process.env.FLIGHTDECK_DATA_DIR).not.toContain("ghp_");
    await store.remove(GITHUB_TOKEN_ACCOUNT);
    expect(await store.get(GITHUB_TOKEN_ACCOUNT)).toBeUndefined();
  });
});
