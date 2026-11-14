import type { PreflightCheck, PreflightReport } from "@flightdeck/shared";
import { CACHE_KEYS, getCache } from "../cache/index.ts";
import { demoGithubMode } from "../github/demo.ts";
import type { DemoPreflightFixture } from "./types.ts";

let fixture: DemoPreflightFixture | undefined;

export function demoPreflightFixture(): DemoPreflightFixture | undefined {
  if (process.env.FLIGHTDECK_DEMO !== "1") return undefined;
  if (fixture) return fixture;
  return process.env.FLIGHTDECK_PREFLIGHT === "fail" ? "fail" : "pass";
}

export function setDemoPreflightFixture(next: DemoPreflightFixture): void {
  fixture = next;
  getCache().invalidate(CACHE_KEYS.preflight);
}

export function resetDemoPreflightFixture(): void {
  fixture = undefined;
  getCache().invalidate(CACHE_KEYS.preflight);
}

export function passingChecks(database: PreflightCheck): PreflightCheck[] {
  return [pass("node", "Node.js", process.versions.node), pass("pnpm", "pnpm", "12.18.0"), pass("git", "git", "2.47.0"), githubDemoCheck(), passClaude(), passJira(), database];
}

export function failingChecks(database: PreflightCheck): PreflightCheck[] {
  return [
    pass("node", "Node.js", process.versions.node),
    pass("pnpm", "pnpm", "12.18.0"),
    {
      id: "git",
      label: "git",
      severity: "required",
      ok: false,
      status: "fail",
      version: "2.14.0",
      detail: "git 2.14.0 is too old for worktrees (need >=2.20.0)",
      fix: "brew install git",
      gates: ["shape", "start"],
    },
    {
      id: "github",
      label: "GitHub token",
      severity: "required",
      ok: false,
      status: "fail",
      detail: "No GitHub token stored",
      fix: "Add a GitHub token in Settings",
      gates: ["shape", "start", "saveGithub"],
    },
    {
      id: "claude",
      label: "Claude auth",
      severity: "required",
      ok: false,
      status: "fail",
      detail: "No apiKeyHelper or Claude login.",
      fix: "Run claude, then type /login",
      gates: ["shape", "start"],
    },
    {
      id: "jira",
      label: "Jira",
      severity: "optional",
      ok: false,
      status: "warn",
      detail: "Jira is configured but the API token is missing",
      fix: "Add a Jira API token in Settings",
      gates: ["saveJira"],
    },
    database,
  ];
}

export function demoReport(database: PreflightCheck, mode: DemoPreflightFixture): PreflightReport {
  const checks = mode === "fail" ? failingChecks(database) : passingChecks(database);
  return {
    ok: checks.filter((c) => c.severity === "required").every((c) => c.ok),
    checkedAt: new Date().toISOString(),
    demo: true,
    checks,
  };
}

function pass(id: string, label: string, version: string): PreflightCheck {
  return {
    id,
    label,
    severity: "required",
    ok: true,
    status: "pass",
    version,
    detail: `${label} ${version}`,
  };
}

function githubDemoCheck(): PreflightCheck {
  const mode = demoGithubMode();
  if (mode === "connected") return passGithub();
  const detail =
    mode === "error"
      ? "GitHub token was rejected (401). Create a new PAT and paste it in Settings."
      : mode === "scopes"
        ? "Connected as dan-demo but missing scopes: read:org, workflow. Need repo, read:org, workflow."
        : "No GitHub token stored";
  return {
    id: "github",
    label: "GitHub token",
    severity: "required",
    ok: false,
    status: "fail",
    detail,
    fix: "Add a GitHub token in Settings",
    gates: ["shape", "start", "saveGithub"],
  };
}

function passGithub(): PreflightCheck {
  return {
    id: "github",
    label: "GitHub token",
    severity: "required",
    ok: true,
    status: "pass",
    detail: "Connected as dan-demo (demo); scopes repo, read:org, workflow",
    gates: ["shape", "start", "saveGithub"],
  };
}

function passClaude(): PreflightCheck {
  return {
    id: "claude",
    label: "Claude auth",
    severity: "required",
    ok: true,
    status: "pass",
    detail: "apiKeyHelper found (demo)",
    gates: ["shape", "start"],
  };
}

function passJira(): PreflightCheck {
  return {
    id: "jira",
    label: "Jira",
    severity: "optional",
    ok: true,
    status: "pass",
    detail: "Jira connected as dan@example.com (demo)",
    gates: ["saveJira"],
  };
}
