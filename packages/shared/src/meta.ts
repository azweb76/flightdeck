export const APP_NAME = "Flightdeck";
export const APP_SLUG = "flightdeck";
export const APP_DATA_DIR_NAME = `.${APP_SLUG}`;
export const KEYCHAIN_SERVICE = "flightdeck";
export const DEFAULT_PORT = 47321;
export const DEFAULT_HOST = "127.0.0.1";
export const DEFAULT_THEME = "system" as const;
export const JIRA_TOKEN_ACCOUNT = "jira-api-token";
export const GITHUB_TOKEN_ACCOUNT = "github-token";

export type GithubTokenSource = "GITHUB_TOKEN" | "GH_TOKEN" | "keychain" | "file";

export function githubTokenSourceLabel(source?: GithubTokenSource): string {
  if (source === "GITHUB_TOKEN") return "Using GITHUB_TOKEN from environment";
  if (source === "GH_TOKEN") return "Using GH_TOKEN from environment";
  if (source === "keychain") return "Using the token from the Mac keychain";
  if (source === "file") return "Using the token from ~/.flightdeck/secrets";
  return "";
}

export function appendGithubSourceLabel(detail: string, source?: GithubTokenSource): string {
  const label = githubTokenSourceLabel(source);
  if (!label || detail.includes(label)) return detail;
  return `${detail.replace(/\.$/, "")}. ${label}.`;
}

/** Fail copy when an env token is present — never “no token stored” plus a source label. */
export function githubEnvFailDetail(source?: GithubTokenSource): string {
  if (source === "GITHUB_TOKEN") return "GitHub token from GITHUB_TOKEN was rejected";
  if (source === "GH_TOKEN") return "GitHub token from GH_TOKEN was rejected";
  return "No GitHub token stored";
}
export const GITHUB_NEEDED_SCOPES = ["repo", "read:org", "workflow"] as const;
export const GITHUB_PAT_URL =
  "https://github.com/settings/tokens/new?description=Flightdeck&scopes=repo,read:org,workflow";
export const DEFAULT_JIRA_JQL =
  "assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC";
export const DEFAULT_DOLLAR_CAP_USD = 10;
export const DEFAULT_DAILY_DOLLAR_CAP_USD = 50;
export const DEFAULT_MAX_CONCURRENT = 3;
export const DEFAULT_MODEL = "claude-sonnet-4-5";
export const JIRA_API_TOKEN_URL = "https://id.atlassian.com/manage-profile/security/api-tokens";
