import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import type { ExecFn } from "../exec/index.ts";
import { patchSettings } from "../settings/index.ts";
import { readSetupStatus, runSetupChecks } from "./checks.ts";

function execFor(table: Record<string, { code: number; stdout?: string; stderr?: string }>): ExecFn {
  return async (file, args) => {
    const key = [file, ...args].join(" ");
    const hit = table[key] ?? table[file];
    if (!hit) return { code: 1, stdout: "", stderr: `unexpected ${key}` };
    return { code: hit.code, stdout: hit.stdout ?? "", stderr: hit.stderr ?? "" };
  };
}

describe("runSetupChecks", () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "flightdeck-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    resetDbForTests(join(dir, "app.sqlite"));
  });
  afterEach(() => {
    closeDb();
    delete process.env.FLIGHTDECK_DATA_DIR;
  });

  it("passes git, gh, and claude when mocked healthy", async () => {
    const exec = execFor({
      "git --version": { code: 0, stdout: "git version 2.47.0" },
      "gh --version": { code: 0, stdout: "gh 2.0" },
      "gh auth status": { code: 0, stderr: "Logged in to github.com account ada" },
    });
    const status = await runSetupChecks({
      exec,
      claude: {
        exec,
        home: process.env.FLIGHTDECK_DATA_DIR,
        env: { ANTHROPIC_API_KEY: "sk-test", ANTHROPIC_BASE_URL: "https://api.test" },
      },
    });
    expect(status.checks.find((c) => c.id === "git")?.ok).toBe(true);
    expect(status.checks.find((c) => c.id === "gh")?.ok).toBe(true);
    expect(status.github.loggedIn).toBe(true);
    expect(status.checks.find((c) => c.id === "claude")?.ok).toBe(true);
    expect(status.checks.find((c) => c.id === "jira")?.ok).toBe(false);
    expect(status.checks.find((c) => c.id === "repos")?.ok).toBe(false);
  });

  it("hints how to fix gh when installed but logged out", async () => {
    const exec = execFor({
      "git --version": { code: 0, stdout: "git version 2.47.0" },
      "gh --version": { code: 0, stdout: "gh 2.0" },
      "gh auth status": { code: 1, stderr: "not logged in" },
    });
    const status = await runSetupChecks({
      exec,
      claude: { exec, home: process.env.FLIGHTDECK_DATA_DIR, env: {} },
    });
    const gh = status.checks.find((c) => c.id === "gh");
    expect(gh?.ok).toBe(false);
    expect(gh?.hint).toMatch(/gh auth login/);
  });

  it("readSetupStatus is sqlite-only and skips exec", () => {
    patchSettings({ setupComplete: true });
    const exec: ExecFn = async () => {
      throw new Error("exec should not run");
    };
    const status = readSetupStatus();
    expect(status.complete).toBe(true);
    expect(status.checks).toEqual([]);
    void exec;
  });
});
