import type { CatalogRepo, GithubStatus } from "@flightdeck/shared";
import { CACHE_KEYS, getCache } from "../cache/index.ts";
import type { GhIssue, GithubClient } from "./types.ts";

export type DemoGithubMode = "connected" | "empty" | "error";

let mode: DemoGithubMode = "connected";

export function demoGithubMode(): DemoGithubMode {
  return mode;
}

export function setDemoGithubMode(next: DemoGithubMode): void {
  mode = next;
  getCache().invalidate(CACHE_KEYS.githubStatus);
  getCache().invalidate(CACHE_KEYS.preflight);
}

export function resetDemoGithubMode(): void {
  mode = "connected";
  getCache().invalidate(CACHE_KEYS.githubStatus);
  getCache().invalidate(CACHE_KEYS.preflight);
}

export function demoGithubStatus(): GithubStatus {
  if (mode === "empty") {
    return {
      installed: false,
      loggedIn: false,
      hasToken: false,
      oauthAvailable: Boolean(process.env.FLIGHTDECK_GITHUB_CLIENT_ID),
      detail: "Add a GitHub token in Settings",
    };
  }
  if (mode === "error") {
    return {
      installed: true,
      loggedIn: false,
      hasToken: true,
      oauthAvailable: Boolean(process.env.FLIGHTDECK_GITHUB_CLIENT_ID),
      detail: "GitHub token was rejected (401). Create a new PAT and paste it in Settings.",
    };
  }
  return {
    installed: true,
    loggedIn: true,
    hasToken: true,
    user: "dan-demo",
    scopes: ["repo", "read:org", "workflow"],
    oauthAvailable: Boolean(process.env.FLIGHTDECK_GITHUB_CLIENT_ID),
    detail: "Connected as dan-demo (demo); scopes repo, read:org, workflow",
  };
}

export function createDemoGithubClient(): GithubClient {
  return {
    status: async () => demoGithubStatus(),
    listAssignedIssues: async () => demoIssues(),
    listRepos: async () => demoRepos(),
    cloneRepo: async (_owner, _name, dest) => ({ ok: true, detail: dest }),
    createIssue: async (owner, name) => ({ number: 9, url: `https://github.com/${owner}/${name}/issues/9` }),
    updateIssue: async () => undefined,
  };
}

function demoRepos(): CatalogRepo[] {
  return [
    { owner: "acme", name: "web", localPath: "" },
    { owner: "acme", name: "api", localPath: "" },
  ];
}

function demoIssues(): GhIssue[] {
  return [
    {
      id: "github:acme/web#12",
      number: 12,
      title: "Mine",
      body: "b",
      url: "https://github.com/acme/web/issues/12",
      updatedAt: "2026-11-12T00:00:00.000Z",
      owner: "acme",
      name: "web",
    },
  ];
}
