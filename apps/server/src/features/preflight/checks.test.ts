import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SettingsSchema } from "@flightdeck/shared";
import { describe, expect, it } from "vitest";
import type { ExecFn } from "../exec/index.ts";
import { checkClaude } from "./check-claude.ts";
import { checkGh } from "./check-gh.ts";
import { checkJira } from "./check-jira.ts";
import { checkNode, nodeTooOld } from "./check-node.ts";
import { checkGit, checkPnpm } from "./check-tools.ts";
import type { PreflightCtx } from "./types.ts";

const engines = { node: ">=22.13.0", pnpm: ">=12.18.0" };

function ctx(exec: ExecFn, extra: Partial<PreflightCtx> = {}): PreflightCtx {
  return {
    exec,
    env: {},
    home: mkdtempSync(join(tmpdir(), "pf-home-")),
    nodeVersion: "22.13.0",
    engines,
    settings: SettingsSchema.parse({}),
    hasJiraToken: false,
    ...extra,
  };
}

function execFor(table: Record<string, { code: number; stdout?: string; stderr?: string }>): ExecFn {
  return async (file, args) => {
    const key = [file, ...args].join(" ");
    const hit = table[key] ?? table[file];
    if (!hit) return { code: 1, stdout: "", stderr: `missing ${key}` };
    return { code: hit.code, stdout: hit.stdout ?? "", stderr: hit.stderr ?? "" };
  };
}

describe("preflight checks", () => {
  it("fails Node when older than package.json engines", () => {
    const old = checkNode(ctx(execFor({}), { nodeVersion: "20.11.0" }));
    expect(old).toMatchObject({ ok: false, status: "fail", fix: "brew install node@22" });
    expect(nodeTooOld([old])).toBe(true);
    expect(checkNode(ctx(execFor({}))).ok).toBe(true);
  });

  it("fails when pnpm is missing or too old", async () => {
    const missing = await checkPnpm(ctx(execFor({ pnpm: { code: 1, stderr: "not found" } })));
    expect(missing).toMatchObject({ ok: false, fix: "corepack enable" });
    const old = await checkPnpm(ctx(execFor({ "pnpm --version": { code: 0, stdout: "9.0.0\n" } })));
    expect(old.ok).toBe(false);
    const ok = await checkPnpm(ctx(execFor({ "pnpm --version": { code: 0, stdout: "12.18.0\n" } })));
    expect(ok).toMatchObject({ ok: true, version: "12.18.0" });
  });

  it("fails when git is missing, old, or lacks worktrees", async () => {
    const missing = await checkGit(ctx(execFor({ git: { code: 1 } })));
    expect(missing).toMatchObject({ ok: false, fix: "brew install git" });
    const old = await checkGit(
      ctx(
        execFor({
          "git --version": { code: 0, stdout: "git version 2.14.0" },
          "git worktree -h": { code: 0, stdout: "usage" },
        }),
      ),
    );
    expect(old.detail).toMatch(/too old/);
    expect(old.ok).toBe(false);
    const noWt = await checkGit(
      ctx(
        execFor({
          "git --version": { code: 0, stdout: "git version 2.47.0" },
          "git worktree -h": { code: 1, stderr: "unknown" },
        }),
      ),
    );
    expect(noWt.ok).toBe(false);
    const ok = await checkGit(
      ctx(
        execFor({
          "git --version": { code: 0, stdout: "git version 2.47.0" },
          "git worktree -h": { code: 0, stdout: "usage: git worktree" },
        }),
      ),
    );
    expect(ok).toMatchObject({ ok: true, version: "2.47.0" });
  });

  it("fails when gh is missing or unauthenticated", async () => {
    const missing = await checkGh(ctx(execFor({ gh: { code: 1 } })));
    expect(missing).toMatchObject({ ok: false, fix: "brew install gh" });
    const loggedOut = await checkGh(
      ctx(
        execFor({
          "gh --version": { code: 0, stdout: "gh 2.67.0" },
          "gh auth status": { code: 1, stderr: "not logged in" },
        }),
      ),
    );
    expect(loggedOut).toMatchObject({ ok: false, fix: "gh auth login" });
    const ok = await checkGh(
      ctx(
        execFor({
          "gh --version": { code: 0, stdout: "gh 2.67.0" },
          "gh auth status": { code: 0, stderr: "Logged in to github.com account dan" },
        }),
      ),
    );
    expect(ok.ok).toBe(true);
    expect(ok.detail).toContain("dan");
  });

  it("reuses Claude detect for missing, failed helper, and OAuth", async () => {
    const none = await checkClaude(ctx(execFor({})));
    expect(none).toMatchObject({ ok: false, fix: "Run claude, then type /login" });
    const home = mkdtempSync(join(tmpdir(), "pf-claude-"));
    mkdirSync(join(home, ".claude"));
    writeFileSync(join(home, ".claude", "settings.json"), JSON.stringify({ apiKeyHelper: "false" }));
    const helper = await checkClaude(
      ctx(execFor({ "sh -c false": { code: 1 } }), { home, exec: async () => ({ code: 1, stdout: "", stderr: "" }) }),
    );
    expect(helper.ok).toBe(false);
    const oauthHome = mkdtempSync(join(tmpdir(), "pf-oauth-"));
    mkdirSync(join(oauthHome, ".claude"));
    writeFileSync(join(oauthHome, ".claude", ".credentials.json"), "{}");
    const oauth = await checkClaude(ctx(async () => ({ code: 1, stdout: "", stderr: "" }), { home: oauthHome }));
    expect(oauth.ok).toBe(true);
  });

  it("treats Jira as optional: skip, warn, or pass", async () => {
    const skip = await checkJira(ctx(execFor({})));
    expect(skip).toMatchObject({ status: "skip", ok: true, severity: "optional" });
    const noToken = await checkJira(
      ctx(execFor({}), { settings: SettingsSchema.parse({ jiraConfigured: true, jiraEmail: "a@b.c" }) }),
    );
    expect(noToken).toMatchObject({ status: "warn", fix: "Add a Jira API token in Settings" });
    const probeFail = await checkJira(
      ctx(execFor({}), {
        settings: SettingsSchema.parse({ jiraConfigured: true }),
        hasJiraToken: true,
        jiraProbe: async () => {
          throw new Error("Jira login failed (401)");
        },
      }),
    );
    expect(probeFail).toMatchObject({ status: "warn", ok: false });
    const ok = await checkJira(
      ctx(execFor({}), {
        settings: SettingsSchema.parse({ jiraConfigured: true, jiraEmail: "a@b.c" }),
        hasJiraToken: true,
        jiraProbe: async () => ({ ok: true, detail: "Connected as A" }),
      }),
    );
    expect(ok).toMatchObject({ status: "pass", ok: true });
  });
});
