import type {
  CatalogView,
  Change,
  Issue,
  SettingsView,
  SettingsPatch,
  ShapeSession,
  PreflightReport,
} from "@flightdeck/shared";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error || res.statusText);
  return body;
}

export const api = {
  health: () => req<{ ok: boolean; host: string }>("/api/health"),
  settings: () => req<SettingsView>("/api/settings"),
  patchSettings: (patch: SettingsPatch) =>
    req<SettingsView>("/api/settings", { method: "PATCH", body: JSON.stringify(patch) }),
  issues: () => req<{ issues: Issue[] }>("/api/issues"),
  syncIssues: () => req<{ issues: Issue[] }>("/api/issues/sync", { method: "POST" }),
  setIssueRepo: (id: string, repoSlug: string) =>
    req<Issue>(`/api/issues/${encodeURIComponent(id)}/repo`, {
      method: "PATCH",
      body: JSON.stringify({ repoSlug }),
    }),
  repos: (refresh = false) => req<CatalogView>(refresh ? "/api/repos?refresh=1" : "/api/repos"),
  favoriteRepo: (owner: string, name: string, on: boolean) =>
    req<CatalogView>("/api/repos/favorite", { method: "POST", body: JSON.stringify({ owner, name, on }) }),
  startShape: (body: { repoSlug: string; issueId?: string; idea?: string }) =>
    req<ShapeSession>("/api/shape", { method: "POST", body: JSON.stringify(body) }),
  getShape: (id: string) => req<ShapeSession>(`/api/shape/${id}`),
  replyShape: (id: string, text: string) =>
    req<ShapeSession>(`/api/shape/${id}/reply`, { method: "POST", body: JSON.stringify({ text }) }),
  saveShape: (id: string, body: { tracker: "jira" | "github"; projectKey?: string; repoSlug?: string }) =>
    req<Issue>(`/api/shape/${id}/save`, { method: "POST", body: JSON.stringify(body) }),
  saveGithubToken: (token: string) =>
    req<{ ok: true; tokenSource?: SettingsView["githubTokenSource"]; hasGithubToken: boolean }>("/api/github/token", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  disconnectGithub: () =>
    req<{ ok: true; tokenSource?: SettingsView["githubTokenSource"]; hasGithubToken: boolean }>(
      "/api/github/disconnect",
      { method: "POST" },
    ),
  saveJira: (body: { siteUrl: string; email: string; token?: string; projectKey?: string }) =>
    req<{ ok: boolean; settings: SettingsView }>("/api/jira/save", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  preflight: () => req<PreflightReport>("/api/preflight"),
  recheckPreflight: () => req<PreflightReport>("/api/preflight/recheck", { method: "POST" }),
  setDemoPreflight: (fixture: "pass" | "fail" | "github") =>
    req<PreflightReport>("/api/demo/preflight", { method: "POST", body: JSON.stringify({ fixture }) }),
  resetDemo: (seed: boolean) =>
    req<{ ok: boolean }>("/api/demo/reset", { method: "POST", body: JSON.stringify({ seed }) }),
  changes: () => req<{ changes: Change[] }>("/api/changes"),
  startChange: (issueId: string) =>
    req<Change>("/api/changes", { method: "POST", body: JSON.stringify({ issueId }) }),
  getChange: (id: string) => req<Change>(`/api/changes/${id}`),
  replyChange: (id: string, text: string) =>
    req<Change>(`/api/changes/${id}/reply`, { method: "POST", body: JSON.stringify({ text }) }),
  archiveChange: (id: string) => req<Change>(`/api/changes/${id}/archive`, { method: "POST" }),
  resumeChange: (id: string) => req<Change>(`/api/changes/${id}/resume`, { method: "POST" }),
};
