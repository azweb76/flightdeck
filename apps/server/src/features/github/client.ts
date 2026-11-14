import { CACHE_KEYS, getCache, TTL } from "../cache/index.ts";
import { defaultExec } from "../exec/index.ts";
import { GITHUB_TOKEN_ACCOUNT, createSecretStore } from "../secrets/index.ts";
import { createDemoGithubClient } from "./demo.ts";
import { gitClone } from "./git-auth.ts";
import { createIssue, listAssigned, updateIssue } from "./issues.ts";
import { listRepos } from "./repos.ts";
import { githubStatus, loadGithubToken } from "./status.ts";
import type { GithubClient, GithubDeps } from "./types.ts";

export function createGithubClient(deps: GithubDeps = {}): GithubClient {
  if (process.env.FLIGHTDECK_DEMO === "1" && !deps.fetch && !deps.token) return createDemoGithubClient();
  const cache = getCache();
  const fetchFn = deps.fetch ?? fetch;
  const exec = deps.exec ?? defaultExec;
  const tokenOf = () => loadGithubToken(deps.token);
  return {
    status: () => cache.get(CACHE_KEYS.githubStatus, () => githubStatus({ token: deps.token, fetch: fetchFn }), TTL.githubStatus),
    listAssignedIssues: () =>
      cache.get(CACHE_KEYS.githubIssues, async () => listAssigned(await requireToken(tokenOf), fetchFn), TTL.githubIssues),
    listRepos: () => cache.get(CACHE_KEYS.githubRepos, async () => listRepos(await requireToken(tokenOf), fetchFn), TTL.githubRepos),
    cloneRepo: (owner, name, dest) => gitClone(exec, owner, name, dest),
    createIssue: async (owner, name, title, body) => {
      const created = await createIssue(await requireToken(tokenOf), fetchFn, owner, name, title, body);
      cache.invalidate(CACHE_KEYS.githubStatus);
      return created;
    },
    updateIssue: async (owner, name, number, title, body) => {
      await updateIssue(await requireToken(tokenOf), fetchFn, owner, name, number, title, body);
    },
  };
}

async function requireToken(load: () => Promise<string | undefined>): Promise<string> {
  const token = await load();
  if (!token) throw new Error("Add a GitHub token in Settings");
  return token;
}

export async function saveGithubToken(token: string): Promise<void> {
  await createSecretStore().set(token, GITHUB_TOKEN_ACCOUNT);
  getCache().invalidate(CACHE_KEYS.githubStatus);
  getCache().invalidate(CACHE_KEYS.githubRepos);
  getCache().invalidate(CACHE_KEYS.githubIssues);
  getCache().invalidate(CACHE_KEYS.preflight);
}

export async function clearGithubToken(): Promise<void> {
  await createSecretStore().remove(GITHUB_TOKEN_ACCOUNT);
  getCache().invalidate(CACHE_KEYS.githubStatus);
  getCache().invalidate(CACHE_KEYS.githubRepos);
  getCache().invalidate(CACHE_KEYS.githubIssues);
  getCache().invalidate(CACHE_KEYS.preflight);
}
