import type { ClaudeStatus, GithubStatus } from "@flightdeck/shared";
import { detectClaudeConfig } from "../claude/index.ts";
import { createGithubClient } from "../github/index.ts";
import { getSettings } from "../settings/index.ts";
import { createSecretStore } from "../secrets/index.ts";

export async function appStatus(): Promise<{
  claude: ClaudeStatus;
  github: GithubStatus;
  jira: { configured: boolean; detail: string };
  demo: boolean;
}> {
  const demo = process.env.FLIGHTDECK_DEMO === "1";
  const settings = getSettings();
  const token = demo ? undefined : await createSecretStore().get();
  return {
    claude: demo ? demoClaude() : await detectClaudeConfig(),
    github: demo ? demoGithub() : await createGithubClient().status(),
    jira: {
      configured: settings.jiraConfigured,
      detail: settings.jiraConfigured
        ? `Jira connected${settings.jiraEmail ? ` as ${settings.jiraEmail}` : ""}`
        : token
          ? "Token saved; save Settings to finish connecting"
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
    baseUrl: "https://api.anthropic.com",
    sources: ["demo"],
    detail: "apiKeyHelper found (demo); ANTHROPIC_BASE_URL=https://api.anthropic.com",
  };
}

function demoGithub(): GithubStatus {
  return { installed: true, loggedIn: true, user: "dan-demo", detail: "gh logged in as dan-demo (demo)" };
}
