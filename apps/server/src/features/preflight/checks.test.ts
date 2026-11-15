import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CLAUDE_LOGIN_HINT, SettingsSchema } from "@flightdeck/shared";
import { describe, expect, it } from "vitest";
import type { ExecFn } from "../exec/index.ts";
import { checkClaude } from "./check-claude.ts";
import { setDemoGithubMode } from "../github/index.ts";
import { checkGithub } from "./check-github.ts";
import { checkJira } from "./check-jira.ts";
import { checkNode, nodeTooOld } from "./check-node.ts";
import { checkGit, checkPnpm, worktreeHelpOk } from "./check-tools.ts";
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

  it("fails when git is missing or older than 2.20", async () => {
    const missing = await checkGit(ctx(execFor({ git: { code: 1 } })));
    expect(missing).toMatchObject({ ok: false, fix: "brew install git" });
    const old = await checkGit(
      ctx(
        execFor({
          "git --version": { code: 0, stdout: "git version 2.9.0" },
          "git worktree -h": { code: 0, stdout: "usage: git worktree" },
        }),
      ),
    );
    expect(old.detail).toMatch(/too old/);
    expect(old.ok).toBe(false);
  });

  it("accepts Apple Git 2.50 and worktree -h exit 129", async () => {
    expect(
      worktreeHelpOk({
        code: 129,
        stdout: "",
        stderr: "usage: git worktree [-h]\n    add\n    list\n    remove\n",
      }),
    ).toBe(true);
    const apple = await checkGit(
      ctx(
        execFor({
          "git --version": { code: 0, stdout: "git version 2.50.1 (Apple Git-155)" },
          "git worktree -h": { code: 129, stderr: "usage: git worktree add|list|remove" },
        }),
      ),
    );
    expect(apple).toMatchObject({ ok: true, version: "2.50.1" });
    expect(apple.detail).not.toMatch(/does not support worktrees/);
    const plain = await checkGit(
      ctx(
        execFor({
          "git --version": { code: 0, stdout: "2.50.0" },
          "git worktree -h": { code: 129, stdout: "usage: git worktree" },
        }),
      ),
    );
    expect(plain).toMatchObject({ ok: true, version: "2.50.0" });
    const olderApple = await checkGit(
      ctx(
        execFor({
          "git --version": { code: 0, stdout: "2.39.5 (Apple Git-154)" },
          "git worktree -h": { code: 129, stderr: "usage: git worktree" },
        }),
      ),
    );
    expect(olderApple).toMatchObject({ ok: true, version: "2.39.5" });
  });

  it("requires a GitHub token in Settings", async () => {
    process.env.FLIGHTDECK_DEMO = "1";
    setDemoGithubMode("empty");
    const missing = await checkGithub();
    expect(missing.ok).toBe(false);
    expect(missing.detail).toMatch(/No GitHub token stored|GITHUB_TOKEN/);
    setDemoGithubMode("error");
    expect((await checkGithub()).ok).toBe(false);
    setDemoGithubMode("scopes");
    const scopes = await checkGithub();
    expect(scopes.ok).toBe(false);
    expect(scopes.detail).toMatch(/missing scopes/);
    setDemoGithubMode("connected");
    const ok = await checkGithub();
    expect(ok.ok).toBe(true);
    expect(ok.detail).toContain("dan-demo");
    process.env.GITHUB_TOKEN = "test-env-github-token";
    expect((await checkGithub()).detail).toContain("Using GITHUB_TOKEN from environment");
    delete process.env.GITHUB_TOKEN;
    delete process.env.FLIGHTDECK_DEMO;
  });

  it("reuses Claude detect for missing, failed helper, and OAuth", async () => {
    const none = await checkClaude(ctx(execFor({})));
    expect(none).toMatchObject({ ok: false, fix: CLAUDE_LOGIN_HINT });
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
