import type { ClaudeStatus, GithubStatus } from "@flightdeck/shared";
import { detectClaudeConfig, CLAUDE_LOGIN_HINT } from "../claude/index.ts";
import { createGithubClient } from "../github/index.ts";
import { demoPreflightFixture } from "../preflight/demo.ts";
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
  const failDemo = demo && demoPreflightFixture() === "fail";
  const token = demo ? (settings.jiraConfigured && !failDemo ? "demo" : undefined) : await createSecretStore().get();
  const configured = settings.jiraConfigured && !jiraLastError && !failDemo;
  return {
    claude: demo ? (failDemo ? failDemoClaude() : demoClaude()) : await detectClaudeConfig(),
    github: demo ? (failDemo ? failDemoGithub() : demoGithub()) : await createGithubClient().status(),
    jira: {
      configured,
      hasToken: Boolean(token),
      lastError: failDemo ? "Jira is configured but the API token is missing" : jiraLastError,
      detail: jiraDetail(failDemo, configured, Boolean(token), settings.jiraEmail),
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

function failDemoClaude(): ClaudeStatus {
  return {
    found: false,
    apiKeyHelper: false,
    oauth: false,
    loginHint: CLAUDE_LOGIN_HINT,
    sources: ["demo"],
    detail: "No apiKeyHelper or Claude login.",
  };
}

function failDemoGithub(): GithubStatus {
  return { installed: true, loggedIn: false, detail: "gh is installed but not logged in" };
}

function jiraDetail(failDemo: boolean, configured: boolean, hasToken: boolean, email: string): string {
  if (failDemo) return "Jira is configured but the API token is missing";
  if (jiraLastError) return jiraLastError;
  if (configured) return `Jira connected${email ? ` as ${email}` : ""}`;
  if (hasToken) return "Token saved; connect to finish";
  return "Not connected";
}
