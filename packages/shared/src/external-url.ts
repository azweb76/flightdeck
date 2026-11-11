export const JIRA_API_TOKEN_URL = "https://id.atlassian.com/manage-profile/security/api-tokens";

const ALLOWED = new URL(JIRA_API_TOKEN_URL);

function normalizedPath(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}

/** https URLs whose origin+path match the Atlassian API-token page. */
export function isAllowedExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    if (parsed.username || parsed.password) return false;
    if (parsed.origin !== ALLOWED.origin) return false;
    return normalizedPath(parsed.pathname) === normalizedPath(ALLOWED.pathname);
  } catch {
    return false;
  }
}
