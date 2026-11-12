import type { ClaudeStatus, GithubStatus } from "@flightdeck/shared";
import { detectClaudeConfig, CLAUDE_LOGIN_HINT } from "../claude/index.ts";
import { createGithubClient } from "../github/index.ts";
import { getSettings } from "../settings/index.ts";
import { createSecretStore } from "../secrets/index.ts";

let jiraLastError: string | undefined;

export function setJiraLastError(message: string | undefined): void {
  jiraLastError = message;
}

export async function appStatus(): Promise<{
  claude: ClaudeStatus;
  github: GithubStatus;
  jira: { configured: boolean; detail: string; hasToken: boolean; lastError?: string };
  demo: boolean;
}> {
  const demo = process.env.FLIGHTDECK_DEMO === "1";
  const settings = getSettings();
  const token = demo ? (settings.jiraConfigured ? "demo" : undefined) : await createSecretStore().get();
  const configured = settings.jiraConfigured && !jiraLastError;
  return {
    claude: demo ? demoClaude() : await detectClaudeConfig(),
    github: demo ? demoGithub() : await createGithubClient().status(),
    jira: {
      configured,
      hasToken: Boolean(token),
      lastError: jiraLastError,
      detail: jiraLastError
        ? jiraLastError
        : configured
          ? `Jira connected${settings.jiraEmail ? ` as ${settings.jiraEmail}` : ""}`
          : token
            ? "Token saved; connect to finish"
            : "Not connected",
    },
    demo,
  };
}

function demoClaude(): ClaudeStatus {
  return {
    found: true,
    apiKeyHelper: true,
    apiKeyHelperOk: true,
    oauth: false,
    loginHint: CLAUDE_LOGIN_HINT,
    baseUrl: "https://api.anthropic.com",
    sources: ["demo"],
    detail: "apiKeyHelper found (demo); ANTHROPIC_BASE_URL=https://api.anthropic.com",
  };
}

function demoGithub(): GithubStatus {
  return { installed: true, loggedIn: true, user: "dan-demo", detail: "gh logged in as dan-demo (demo)" };
}
