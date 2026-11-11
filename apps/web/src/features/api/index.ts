import type {
  AppNotification,
  CreateRepo,
  Goal,
  Improvement,
  Issue,
  PatchRepo,
  PrReviewSession,
  Question,
  Repo,
  Run,
  Settings,
  SettingsPatch,
  SetupStatus,
  TranscriptEvent,
} from "@flightdeck/shared";

const inflight = new Map<string, Promise<unknown>>();

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const key = `${method} ${path}`;
  if (method === "GET") {
    const hit = inflight.get(key);
    if (hit) return hit as Promise<T>;
  }
  const pending = requestOnce<T>(path, init);
  if (method === "GET") {
    inflight.set(key, pending);
    pending.finally(() => inflight.delete(key));
  }
  return pending;
}

async function requestOnce<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: { message: string } };
  if (!res.ok) throw new Error(body.error?.message ?? res.statusText);
  return body;
}

export const api = {
  setup: () => request<SetupStatus>("/api/setup/status"),
  recheck: () => request<SetupStatus>("/api/setup/recheck", { method: "POST" }),
  connectJira: (body: { siteUrl: string; email: string; apiToken: string }) =>
    request<{ ok: boolean; detail: string }>("/api/setup/jira", { method: "POST", body: JSON.stringify(body) }),
  importConfig: (body: unknown) =>
    request<{ ok: boolean; reposAdded: number }>("/api/setup/import", { method: "POST", body: JSON.stringify(body) }),
  exportConfig: () => request<unknown>("/api/setup/export"),
  completeSetup: () => request<{ ok: boolean }>("/api/setup/complete", { method: "POST" }),
  settings: () => request<Settings>("/api/settings"),
  saveSettings: (patch: SettingsPatch) =>
    request<Settings>("/api/settings", { method: "PUT", body: JSON.stringify(patch) }),
  repos: () => request<{ repos: Repo[] }>("/api/repos"),
  addRepo: (body: CreateRepo) => request<Repo>("/api/repos", { method: "POST", body: JSON.stringify(body) }),
  patchRepo: (id: number, body: PatchRepo) =>
    request<Repo>(`/api/repos/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteRepo: (id: number) => request<{ ok: boolean }>(`/api/repos/${id}`, { method: "DELETE" }),
  cloneRepo: (id: number) => request<Repo>(`/api/repos/${id}/clone`, { method: "POST" }),
  issues: (query: { source?: string; repo?: string; refresh?: string } = {}) => {
    const q = new URLSearchParams();
    if (query.source) q.set("source", query.source);
    if (query.repo) q.set("repo", query.repo);
    if (query.refresh) q.set("refresh", query.refresh);
    const s = q.toString();
    return request<{
      issues: Issue[];
      errors: string[];
      offline: boolean;
      offlineSources?: { jira: boolean; github: boolean };
      fromCache: boolean;
    }>(
      `/api/issues${s ? `?${s}` : ""}`,
    );
  },
  pickIssueRepo: (id: string, owner: string, name: string, label?: string) =>
    request<Issue>(`/api/issues/${encodeURIComponent(id)}/repo`, {
      method: "POST",
      body: JSON.stringify({ owner, name, label }),
    }),
  issue: (id: string) => request<Issue>(`/api/issues/${encodeURIComponent(id)}`),
  startRun: (issueId: string, repoId?: number) =>
    request<Run>("/api/runs", { method: "POST", body: JSON.stringify({ issueId, repoId }) }),
  runs: () => request<{ runs: Run[]; active: number }>("/api/runs"),
  run: (id: number) => request<{ run: Run; events: TranscriptEvent[]; question?: Question | null }>(`/api/runs/${id}`),
  cancelRun: (id: number) => request<Run>(`/api/runs/${id}/cancel`, { method: "POST" }),
  resumeRun: (id: number) => request<Run>(`/api/runs/${id}/resume`, { method: "POST" }),
  messageRun: (id: number, text: string, target: "current" | "next" | "run") =>
    request<{ ok: boolean }>(`/api/runs/${id}/message`, { method: "POST", body: JSON.stringify({ text, target }) }),
  answerRun: (id: number, answer: string) =>
    request<Run>(`/api/runs/${id}/answer`, { method: "POST", body: JSON.stringify({ answer }) }),
  fixRun: (id: number) => request<Run>(`/api/runs/${id}/fix`, { method: "POST" }),
  sessionReview: (id: number) =>
    request<{ score: unknown; improvements: Improvement[] }>(`/api/stats/runs/${id}/session-review`, { method: "POST" }),
  goal: (issueId: string) =>
    request<{ goal: Goal | null; questions: { id: string; prompt: string; options: { id: string; label: string }[] }[] }>(
      `/api/issues/${encodeURIComponent(issueId)}/goal`,
    ),
  refine: (issueId: string) =>
    request<{ questions: { id: string; prompt: string; options: { id: string; label: string }[] }[] }>(
      `/api/issues/${encodeURIComponent(issueId)}/refine`,
      { method: "POST" },
    ),
  refineAnswers: (issueId: string, answers: { questionId: string; optionId?: string; other?: string }[]) =>
    request<Goal>(`/api/issues/${encodeURIComponent(issueId)}/refine/answers`, {
      method: "POST",
      body: JSON.stringify({ issueId, answers }),
    }),
  saveGoal: (issueId: string, markdown: string) =>
    request<Goal>(`/api/issues/${encodeURIComponent(issueId)}/goal`, {
      method: "PUT",
      body: JSON.stringify({ markdown }),
    }),
  approveGoal: (issueId: string) =>
    request<Goal>(`/api/issues/${encodeURIComponent(issueId)}/goal/approve`, { method: "POST" }),
  splitIssue: (issueId: string) =>
    request<{ created: string[] }>(`/api/issues/${encodeURIComponent(issueId)}/split`, { method: "POST" }),
  adhoc: (repoId: number, title: string, body: string) =>
    request<Run>("/api/issues/adhoc", { method: "POST", body: JSON.stringify({ repoId, title, body }) }),
  notifications: () =>
    request<{ notifications: AppNotification[]; unread: number; questions: Question[] }>("/api/notifications"),
  reviews: () => request<{ reviews: PrReviewSession[] }>("/api/reviews"),
  createReview: (repoSlug?: string, prNumber?: number) =>
    request<PrReviewSession>("/api/reviews", {
      method: "POST",
      body: JSON.stringify(repoSlug && prNumber ? { repoSlug, prNumber } : {}),
    }),
  runDiff: (id: number) => request<{ diff: string }>(`/api/runs/${id}/diff`),
  sessionReviewGet: (id: number) =>
    request<{
      score: { notes: string; waste: number; backtracking: number; prQuality: number; stuck: number; missingContext: number };
      findings: { title: string; detail: string; excerpt?: string }[];
      improvements: Improvement[];
    }>(`/api/stats/runs/${id}/session-review`),
  draftIssue: (body: { source?: "github" | "jira"; repoId?: number; projectKey?: string; title: string; body: string }) =>
    request<{ id: string }>("/api/issues/draft", { method: "POST", body: JSON.stringify(body) }),
  review: (id: number) => request<PrReviewSession>(`/api/reviews/${id}`),
  patchDraft: (reviewId: number, draftId: number, state: string, body?: string) =>
    request<PrReviewSession>(`/api/reviews/${reviewId}/drafts/${draftId}`, {
      method: "POST",
      body: JSON.stringify({ state, body }),
    }),
  submitReview: (id: number) => request<PrReviewSession>(`/api/reviews/${id}/submit`, { method: "POST" }),
  stats: () => request<StatsPayload>("/api/stats"),
  improvements: () => request<{ improvements: Improvement[] }>("/api/stats/improvements"),
  decideImprovement: (id: number, status: string) =>
    request<{ ok: boolean }>(`/api/stats/improvements/${id}`, { method: "POST", body: JSON.stringify({ status }) }),
};

export type StatsPayload = {
  spendUsd: number;
  prsMerged: number;
  avgRounds: number;
  avgTimeToPrMs: number;
  costByRepo: { repo: string; usd: number }[];
  costByDay: { day: string; usd: number }[];
  outcomes: { merged: number; neededFixes: number; failed: number };
};

export function subscribeEvents(onEvent: (type?: string) => void): () => void {
  const src = new EventSource("/api/events");
  src.onmessage = () => onEvent();
  for (const type of [
    "settings.updated",
    "repos.updated",
    "setup.updated",
    "issues.updated",
    "runs.updated",
    "run.event",
    "questions.updated",
    "notifications.updated",
    "goals.updated",
    "reviews.updated",
    "improvements.updated",
  ]) {
    src.addEventListener(type, () => onEvent(type));
  }
  return () => src.close();
}
