import type { ClaudeStatus, GithubStatus, PreflightCheck, PreflightReport } from "@flightdeck/shared";
import type { AppStatus } from "../api.ts";

export function overlayStatus(status: AppStatus, report?: PreflightReport): AppStatus {
  if (!report) return status;
  return {
    ...status,
    claude: overlayClaude(status.claude, find(report, "claude")),
    github: overlayGithub(status.github, find(report, "github")),
    jira: overlayJira(status.jira, find(report, "jira")),
  };
}

function find(report: PreflightReport, id: string): PreflightCheck | undefined {
  return report.checks.find((c) => c.id === id);
}

function overlayClaude(base: ClaudeStatus, check?: PreflightCheck): ClaudeStatus {
  if (!check || check.ok) return base;
  return {
    ...base,
    found: false,
    apiKeyHelper: false,
    apiKeyHelperOk: false,
    oauth: false,
    detail: check.detail,
  };
}

function overlayGithub(base: GithubStatus, check?: PreflightCheck): GithubStatus {
  if (!check || check.ok) return base;
  const scopes = /missing scopes/i.test(check.detail);
  return {
    ...base,
    loggedIn: false,
    user: scopes ? base.user : undefined,
    detail: check.detail,
  };
}

function overlayJira(
  base: AppStatus["jira"],
  check?: PreflightCheck,
): AppStatus["jira"] {
  if (!check || check.ok) return base;
  return { ...base, configured: false, lastError: check.detail, detail: check.detail };
}
