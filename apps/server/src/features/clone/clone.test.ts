import { mkdtempSync } from "node:fs";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { patchSettings } from "../settings/index.ts";
import { getRepoBySlug } from "../repos/index.ts";
import { ensureClone } from "./index.ts";

describe("ensureClone", () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fd-"));
    resetDbForTests(join(dir, "app.sqlite"));
    const repos = join(dir, "repos");
    patchSettings({ workspaceFolder: repos });
  });
  afterEach(() => closeDb());

  it("reuses a clone folder that already has .git", async () => {
    const settings = (await import("../settings/index.ts")).getSettings();
    const dest = join(settings.workspaceFolder, "acme", "web");
    mkdirSync(join(dest, ".git"), { recursive: true });
    writeFileSync(join(dest, ".git", "HEAD"), "ref: refs/heads/main");
    const calls: string[] = [];
    const exec = async (cmd: string, args: string[]) => {
      calls.push([cmd, ...args].join(" "));
      return { code: 0, stdout: "", stderr: "" };
    };
    const r = await ensureClone("acme", "web", exec);
    expect(r.localPath).toBe(dest);
    expect(getRepoBySlug("acme/web")?.localPath).toBe(dest);
    expect(calls.some((c) => c.includes("fetch"))).toBe(true);
    expect(calls.some((c) => c.includes("clone"))).toBe(false);
  });
});
