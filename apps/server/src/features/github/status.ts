import type { GithubStatus } from "@flightdeck/shared";
import { GITHUB_NEEDED_SCOPES, appendGithubSourceLabel } from "@flightdeck/shared";
import { createOctokit, githubCall, type FetchFn } from "./octokit.ts";
import { headerOf, missingScopes, parseScopeHeader } from "./scopes.ts";
import { resolveGithubToken } from "./token.ts";

export async function loadGithubToken(explicit?: string): Promise<string | undefined> {
  if (explicit?.trim()) return explicit.trim();
  return (await resolveGithubToken())?.token;
}

export async function githubStatus(opts: { token?: string; fetch?: FetchFn } = {}): Promise<GithubStatus> {
  const resolved = await resolveGithubToken();
  const token = opts.token ?? resolved?.token;
  const tokenSource = opts.token ? undefined : resolved?.source;
  const oauthAvailable = Boolean(process.env.FLIGHTDECK_GITHUB_CLIENT_ID);
  if (!token) {
    return {
      installed: false,
      loggedIn: false,
      hasToken: false,
      oauthAvailable,
      detail: "Set GITHUB_TOKEN or paste a PAT in Settings",
    };
  }
  const storage = tokenSource === "keychain" || tokenSource === "file" ? tokenSource : undefined;
  try {
    const octokit = createOctokit(token, opts.fetch ?? fetch);
    const res = await githubCall(() => octokit.rest.users.getAuthenticated());
    const login = res.data.login;
    const scopes = parseScopeHeader(headerOf(res.headers, "x-oauth-scopes"));
    const missing = scopes.length ? missingScopes(scopes) : [];
    const fineGrained = scopes.length === 0;
    const fileWarn = storage === "file" ? " Stored in ~/.flightdeck/secrets (keychain unavailable)." : "";
    if (missing.length) {
      return withSource({
        installed: true,
        loggedIn: false,
        hasToken: true,
        user: login,
        scopes,
        storage,
        oauthAvailable,
        tokenSource,
        detail: `Connected as ${login} but missing scopes: ${missing.join(", ")}. Need ${GITHUB_NEEDED_SCOPES.join(", ")}.`,
      });
    }
    const scopeText = fineGrained
      ? "fine-grained token (grant Contents, Issues, Metadata, Pull requests, Workflows)"
      : `scopes ${scopes.join(", ")}`;
    return withSource({
      installed: true,
      loggedIn: true,
      hasToken: true,
      user: login,
      scopes: fineGrained ? ["fine-grained"] : scopes,
      storage,
      oauthAvailable,
      tokenSource,
      detail: `Connected as ${login}; ${scopeText}.${fileWarn}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "GitHub login failed";
    return withSource({
      installed: true,
      loggedIn: false,
      hasToken: true,
      storage,
      oauthAvailable,
      tokenSource,
      detail: /401|bad credentials|unauthorized/i.test(message)
        ? "GitHub token was rejected (401). Create a new PAT and paste it in Settings."
        : message,
    });
  }
}

function withSource(status: GithubStatus): GithubStatus {
  if (!status.loggedIn) return status;
  return { ...status, detail: appendGithubSourceLabel(status.detail, status.tokenSource) };
}
