import { CLAUDE_LOGIN_HINT, githubEnvFailDetail, type PreflightCheck, type PreflightReport } from "@flightdeck/shared";
import { DEMO_JIRA_EMAIL } from "../demo/seed-jira.ts";
import { demoGithubStatus, setDemoGithubMode } from "../github/demo.ts";
import { envGithubToken } from "../github/token.ts";
import { githubCheckFromStatus } from "./check-github.ts";
import type { DemoPreflightFixture } from "./types.ts";

let fixture: DemoPreflightFixture | undefined;

export function demoPreflightFixture(): DemoPreflightFixture | undefined {
  if (process.env.FLIGHTDECK_DEMO !== "1") return undefined;
  if (fixture) return fixture;
  if (process.env.FLIGHTDECK_PREFLIGHT === "fail") return "fail";
  if (process.env.FLIGHTDECK_PREFLIGHT === "github") return "github";
  return "pass";
}

export function setDemoPreflightFixture(next: DemoPreflightFixture): void {
  fixture = next;
  setDemoGithubMode(next === "github" ? "empty" : "connected");
}

export function resetDemoPreflightFixture(): void {
  fixture = undefined;
  setDemoGithubMode("connected");
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
      gates: ["pickRepo", "refine", "start"],
    },
    githubFailCheck(),
    {
      id: "claude",
      label: "Claude auth",
      severity: "required",
      ok: false,
      status: "fail",
      detail: "No apiKeyHelper or Claude login.",
      fix: CLAUDE_LOGIN_HINT,
      gates: ["refine", "start"],
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

export function githubOnlyFailChecks(database: PreflightCheck): PreflightCheck[] {
  return passingChecks(database).map((check) =>
    check.id === "github"
      ? {
          ...check,
          ok: false,
          status: "fail" as const,
          detail: githubEnvFailDetail(envGithubToken()?.source),
          fix: "Add a GitHub token in Settings",
          gates: ["start", "saveGithub"],
        }
      : check,
  );
}

export function demoReport(database: PreflightCheck, mode: DemoPreflightFixture): PreflightReport {
  const checks =
    mode === "fail" ? failingChecks(database) : mode === "github" ? githubOnlyFailChecks(database) : passingChecks(database);
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
  return githubCheckFromStatus(demoGithubStatus());
}

function githubFailCheck(): PreflightCheck {
  return {
    id: "github",
    label: "GitHub token",
    severity: "required",
    ok: false,
    status: "fail",
    detail: githubEnvFailDetail(envGithubToken()?.source),
    fix: "Add a GitHub token in Settings",
    gates: ["start", "saveGithub"],
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
    gates: ["refine", "start"],
  };
}

function passJira(): PreflightCheck {
  return {
    id: "jira",
    label: "Jira",
    severity: "optional",
    ok: true,
    status: "pass",
    detail: `Jira connected as ${DEMO_JIRA_EMAIL} (demo)`,
    gates: ["saveJira"],
  };
}
