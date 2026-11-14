import { mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { secretsFile } from "../../paths.ts";
import { GITHUB_TOKEN_ACCOUNT, createSecretStore } from "./index.ts";

describe("secret store", () => {
  const prev = process.env.FLIGHTDECK_DATA_DIR;

  beforeEach(() => {
    process.env.FLIGHTDECK_DATA_DIR = mkdtempSync(join(tmpdir(), "fd-sec-"));
    process.env.FLIGHTDECK_NO_KEYCHAIN = "1";
  });
  afterEach(async () => {
    await createSecretStore().remove(GITHUB_TOKEN_ACCOUNT);
    if (prev) process.env.FLIGHTDECK_DATA_DIR = prev;
    else delete process.env.FLIGHTDECK_DATA_DIR;
    delete process.env.FLIGHTDECK_NO_KEYCHAIN;
  });

  it("round-trips a GitHub token without putting it in the data dir name", async () => {
    const store = createSecretStore();
    await store.set("ghp_test_token", GITHUB_TOKEN_ACCOUNT);
    expect(await store.get(GITHUB_TOKEN_ACCOUNT)).toBe("ghp_test_token");
    expect(await store.storage(GITHUB_TOKEN_ACCOUNT)).toBe("file");
    expect(statSync(secretsFile(GITHUB_TOKEN_ACCOUNT)).mode & 0o777).toBe(0o600);
    expect(process.env.FLIGHTDECK_DATA_DIR).not.toContain("ghp_");
    await store.remove(GITHUB_TOKEN_ACCOUNT);
    expect(await store.get(GITHUB_TOKEN_ACCOUNT)).toBeUndefined();
  });
});
