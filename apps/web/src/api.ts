import type {
  CatalogRepo,
  Issue,
  Settings,
  SettingsPatch,
  ShapeSession,
  ClaudeStatus,
  GithubStatus,
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

export type AppStatus = {
  claude: ClaudeStatus;
  github: GithubStatus;
  jira: { configured: boolean; detail: string; hasToken: boolean; lastError?: string };
  demo: boolean;
};

export const api = {
  health: () => req<{ ok: boolean; host: string }>("/api/health"),
  status: () => req<AppStatus>("/api/status"),
  settings: () => req<Settings>("/api/settings"),
  patchSettings: (patch: SettingsPatch) =>
    req<Settings>("/api/settings", { method: "PATCH", body: JSON.stringify(patch) }),
  issues: () => req<{ issues: Issue[] }>("/api/issues"),
  syncIssues: () => req<{ issues: Issue[] }>("/api/issues/sync", { method: "POST" }),
  setIssueRepo: (id: string, repoSlug: string) =>
    req<Issue>(`/api/issues/${encodeURIComponent(id)}/repo`, {
      method: "PATCH",
      body: JSON.stringify({ repoSlug }),
    }),
  repos: () => req<{ repos: CatalogRepo[] }>("/api/repos"),
  startShape: (body: { repoSlug: string; issueId?: string; idea?: string }) =>
    req<ShapeSession>("/api/shape", { method: "POST", body: JSON.stringify(body) }),
  getShape: (id: string) => req<ShapeSession>(`/api/shape/${id}`),
  replyShape: (id: string, text: string) =>
    req<ShapeSession>(`/api/shape/${id}/reply`, { method: "POST", body: JSON.stringify({ text }) }),
  saveShape: (id: string, body: { tracker: "jira" | "github"; projectKey?: string; repoSlug?: string }) =>
    req<Issue>(`/api/shape/${id}/save`, { method: "POST", body: JSON.stringify(body) }),
  connectJira: (body: { siteUrl: string; email: string; token?: string; projectKey?: string }) =>
    req<{ ok: boolean; detail: string; settings: Settings }>("/api/jira/connect", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  claudeLogin: () => req<{ ok: boolean; detail: string }>("/api/claude/login", { method: "POST" }),
  resetDemo: (seed: boolean) =>
    req<{ ok: boolean }>("/api/demo/reset", { method: "POST", body: JSON.stringify({ seed }) }),
};
