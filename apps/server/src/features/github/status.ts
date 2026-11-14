import type { GithubStatus } from "@flightdeck/shared";
import { GITHUB_NEEDED_SCOPES } from "@flightdeck/shared";
import { GITHUB_TOKEN_ACCOUNT, createSecretStore } from "../secrets/index.ts";
import { createOctokit, githubCall, type FetchFn } from "./octokit.ts";
import { headerOf, missingScopes, parseScopeHeader } from "./scopes.ts";

export async function loadGithubToken(explicit?: string): Promise<string | undefined> {
  if (explicit) return explicit;
  return createSecretStore().get(GITHUB_TOKEN_ACCOUNT);
}

export async function githubStatus(opts: { token?: string; fetch?: FetchFn } = {}): Promise<GithubStatus> {
  const store = createSecretStore();
  const token = opts.token ?? (await store.get(GITHUB_TOKEN_ACCOUNT));
  const oauthAvailable = Boolean(process.env.FLIGHTDECK_GITHUB_CLIENT_ID);
  if (!token) {
    return {
      installed: false,
      loggedIn: false,
      hasToken: false,
      oauthAvailable,
      detail: "Add a GitHub token in Settings",
    };
  }
  const storage = await store.storage(GITHUB_TOKEN_ACCOUNT);
  try {
    const octokit = createOctokit(token, opts.fetch ?? fetch);
    const res = await githubCall(() => octokit.rest.users.getAuthenticated());
    const login = res.data.login;
    const scopes = parseScopeHeader(headerOf(res.headers, "x-oauth-scopes"));
    const missing = scopes.length ? missingScopes(scopes) : [];
    const fineGrained = scopes.length === 0;
    const fileWarn = storage === "file" ? " Stored in ~/.flightdeck/secrets (keychain unavailable)." : "";
    if (missing.length) {
      return {
        installed: true,
        loggedIn: false,
        hasToken: true,
        user: login,
        scopes,
        storage,
        oauthAvailable,
        detail: `Connected as ${login} but missing scopes: ${missing.join(", ")}. Need ${GITHUB_NEEDED_SCOPES.join(", ")}.`,
      };
    }
    const scopeText = fineGrained
      ? "fine-grained token (grant Contents, Issues, Metadata, Pull requests, Workflows)"
      : `scopes ${scopes.join(", ")}`;
    return {
      installed: true,
      loggedIn: true,
      hasToken: true,
      user: login,
      scopes: fineGrained ? ["fine-grained"] : scopes,
      storage,
      oauthAvailable,
      detail: `Connected as ${login}; ${scopeText}.${fileWarn}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "GitHub login failed";
    return {
      installed: true,
      loggedIn: false,
      hasToken: true,
      storage,
      oauthAvailable,
      detail: /401|bad credentials|unauthorized/i.test(message)
        ? "GitHub token was rejected (401). Create a new PAT and paste it in Settings."
        : message,
    };
  }
}
