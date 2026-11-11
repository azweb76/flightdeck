import type {
  Issue,
  Repo,
  Settings,
  SettingsPatch,
  SetupStatus,
  CreateRepo,
  PatchRepo,
} from "@flightdeck/shared";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = (await res.json().catch(() => ({}))) as T & {
    error?: { message: string };
  };
  if (!res.ok) throw new Error(body.error?.message ?? res.statusText);
  return body;
}

export const api = {
  setup: () => request<SetupStatus>("/api/setup/status"),
  recheck: () => request<SetupStatus>("/api/setup/recheck", { method: "POST" }),
  connectJira: (body: { siteUrl: string; email: string; apiToken: string }) =>
    request<{ ok: boolean; detail: string }>("/api/setup/jira", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  importConfig: (body: unknown) =>
    request<{ ok: boolean; reposAdded: number }>("/api/setup/import", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  completeSetup: () => request<{ ok: boolean }>("/api/setup/complete", { method: "POST" }),
  settings: () => request<Settings>("/api/settings"),
  saveSettings: (patch: SettingsPatch) =>
    request<Settings>("/api/settings", { method: "PUT", body: JSON.stringify(patch) }),
  repos: () => request<{ repos: Repo[] }>("/api/repos"),
  addRepo: (body: CreateRepo) =>
    request<Repo>("/api/repos", { method: "POST", body: JSON.stringify(body) }),
  patchRepo: (id: number, body: PatchRepo) =>
    request<Repo>(`/api/repos/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteRepo: (id: number) =>
    request<{ ok: boolean }>(`/api/repos/${id}`, { method: "DELETE" }),
  cloneRepo: (id: number) => request<Repo>(`/api/repos/${id}/clone`, { method: "POST" }),
  issues: (query: { source?: string; repo?: string } = {}) => {
    const q = new URLSearchParams();
    if (query.source) q.set("source", query.source);
    if (query.repo) q.set("repo", query.repo);
    const s = q.toString();
    return request<{ issues: Issue[]; errors: string[] }>(`/api/issues${s ? `?${s}` : ""}`);
  },
  issue: (id: string) => request<Issue>(`/api/issues/${encodeURIComponent(id)}`),
};

export function subscribeEvents(onEvent: () => void): () => void {
  const src = new EventSource("/api/events");
  src.onmessage = () => onEvent();
  for (const type of ["settings.updated", "repos.updated", "setup.updated", "issues.updated"]) {
    src.addEventListener(type, () => onEvent());
  }
  return () => src.close();
}
