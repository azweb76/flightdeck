import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GITHUB_TOKEN_ACCOUNT, createSecretStore } from "../secrets/index.ts";
import { envGithubToken, resolveGithubToken } from "./token.ts";

describe("github token precedence", () => {
  const prevGithub = process.env.GITHUB_TOKEN;
  const prevGh = process.env.GH_TOKEN;
  const prevDir = process.env.FLIGHTDECK_DATA_DIR;

  beforeEach(() => {
    process.env.FLIGHTDECK_DATA_DIR = mkdtempSync(join(tmpdir(), "fd-tok-"));
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
  });

  afterEach(async () => {
    await createSecretStore().remove(GITHUB_TOKEN_ACCOUNT);
    restore("GITHUB_TOKEN", prevGithub);
    restore("GH_TOKEN", prevGh);
    restore("FLIGHTDECK_DATA_DIR", prevDir);
  });

  it("prefers GITHUB_TOKEN over GH_TOKEN and the stored token", async () => {
    process.env.GITHUB_TOKEN = "from-github-token";
    process.env.GH_TOKEN = "from-gh-token";
    await createSecretStore().set("from-store", GITHUB_TOKEN_ACCOUNT);
    expect(envGithubToken()?.source).toBe("GITHUB_TOKEN");
    const resolved = await resolveGithubToken();
    expect(resolved).toEqual({ token: "from-github-token", source: "GITHUB_TOKEN" });
  });

  it("uses GH_TOKEN when GITHUB_TOKEN is unset", async () => {
    process.env.GH_TOKEN = "from-gh-token";
    await createSecretStore().set("from-store", GITHUB_TOKEN_ACCOUNT);
    expect(await resolveGithubToken()).toEqual({ token: "from-gh-token", source: "GH_TOKEN" });
  });

  it("falls back to the secrets file", async () => {
    await createSecretStore().set("from-store", GITHUB_TOKEN_ACCOUNT);
    const stored = await resolveGithubToken();
    expect(stored?.token).toBe("from-store");
    expect(["file", "keychain"]).toContain(stored?.source);
  });

  it("does not persist an env token", async () => {
    process.env.GITHUB_TOKEN = "env-only";
    await resolveGithubToken();
    expect(await createSecretStore().get(GITHUB_TOKEN_ACCOUNT)).toBeUndefined();
  });
});

function restore(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
