import type { Run, RunPhase, RunStatus, TranscriptEvent } from "@flightdeck/shared";
import { getDb } from "../db/index.ts";

type RunRow = {
  id: number;
  issue_id: string;
  issue_key: string;
  issue_title: string;
  issue_source: string;
  issue_url: string;
  repo_id: number;
  repo_slug: string;
  branch: string;
  worktree_path: string;
  phase: string;
  round: number;
  max_rounds: number;
  status: string;
  cost_usd: number;
  cap_usd: number;
  pr_url: string | null;
  pr_number: number | null;
  pr_draft: number;
  pause_reason: string | null;
  question_id: number | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
};

export function listRuns(): Run[] {
  return (getDb().prepare("SELECT * FROM runs ORDER BY id DESC").all() as RunRow[]).map(toRun);
}

export function getRun(id: number): Run | undefined {
  const row = getDb().prepare("SELECT * FROM runs WHERE id = ?").get(id) as RunRow | undefined;
  return row ? toRun(row) : undefined;
}

export function runsForIssue(issueId: string): Run[] {
  return (
    getDb().prepare("SELECT * FROM runs WHERE issue_id = ? ORDER BY id DESC").all(issueId) as RunRow[]
  ).map(toRun);
}

export function activeRunCount(): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM runs WHERE status IN ('queued','running','paused','asking')")
    .get() as { n: number };
  return Number(row.n);
}

export function insertRun(input: Omit<Run, "id">): Run {
  const r = getDb()
    .prepare(
      `INSERT INTO runs (
        issue_id, issue_key, issue_title, issue_source, issue_url, repo_id, repo_slug,
        branch, worktree_path, phase, round, max_rounds, status, cost_usd, cap_usd,
        pr_url, pr_number, pr_draft, pause_reason, question_id, created_at, updated_at,
        started_at, finished_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      input.issueId,
      input.issueKey,
      input.issueTitle,
      input.issueSource,
      input.issueUrl,
      input.repoId,
      input.repoSlug,
      input.branch,
      input.worktreePath,
      input.phase,
      input.round,
      input.maxRounds,
      input.status,
      input.costUsd,
      input.capUsd,
      input.prUrl ?? null,
      input.prNumber ?? null,
      input.prDraft ? 1 : 0,
      input.pauseReason ?? null,
      input.questionId ?? null,
      input.createdAt,
      input.updatedAt,
      input.startedAt ?? null,
      input.finishedAt ?? null,
    );
  return getRun(Number(r.lastInsertRowid))!;
}

export function updateRun(
  id: number,
  patch: Partial<{
    status: RunStatus;
    phase: RunPhase;
    round: number;
    costUsd: number;
    worktreePath: string;
    prUrl: string;
    prNumber: number;
    pauseReason: string | null;
    questionId: number | null;
    startedAt: string;
    finishedAt: string;
  }>,
): Run | undefined {
  const cur = getRun(id);
  if (!cur) return undefined;
  const next = { ...cur, ...patch, updatedAt: new Date().toISOString() };
  getDb()
    .prepare(
      `UPDATE runs SET phase=?, round=?, status=?, cost_usd=?, worktree_path=?,
        pr_url=?, pr_number=?, pause_reason=?, question_id=?, updated_at=?,
        started_at=?, finished_at=? WHERE id=?`,
    )
    .run(
      next.phase,
      next.round,
      next.status,
      next.costUsd,
      next.worktreePath,
      next.prUrl ?? null,
      next.prNumber ?? null,
      next.pauseReason ?? null,
      next.questionId ?? null,
      next.updatedAt,
      next.startedAt ?? null,
      next.finishedAt ?? null,
      id,
    );
  return getRun(id);
}

export function insertEvent(
  e: Omit<TranscriptEvent, "id">,
): TranscriptEvent {
  const r = getDb()
    .prepare(
      `INSERT INTO transcript_events
        (run_id, session_id, role, kind, title, detail, tool, path, tokens_in, tokens_out, usd, at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      e.runId,
      e.sessionId ?? null,
      e.role ?? null,
      e.kind,
      e.title,
      e.detail,
      e.tool ?? null,
      e.path ?? null,
      e.tokensIn ?? null,
      e.tokensOut ?? null,
      e.usd ?? null,
      e.at,
    );
  return { ...e, id: Number(r.lastInsertRowid) };
}

export function listEvents(runId: number): TranscriptEvent[] {
  const rows = getDb()
    .prepare("SELECT * FROM transcript_events WHERE run_id = ? ORDER BY id")
    .all(runId) as Record<string, unknown>[];
  return rows.map((row) => ({
    id: Number(row.id),
    runId: Number(row.run_id),
    sessionId: row.session_id != null ? Number(row.session_id) : undefined,
    role: (row.role as TranscriptEvent["role"]) ?? undefined,
    kind: row.kind as TranscriptEvent["kind"],
    title: String(row.title),
    detail: String(row.detail ?? ""),
    tool: (row.tool as string) ?? undefined,
    path: (row.path as string) ?? undefined,
    tokensIn: row.tokens_in != null ? Number(row.tokens_in) : undefined,
    tokensOut: row.tokens_out != null ? Number(row.tokens_out) : undefined,
    usd: row.usd != null ? Number(row.usd) : undefined,
    at: String(row.at),
  }));
}

function toRun(row: RunRow): Run {
  return {
    id: row.id,
    issueId: row.issue_id,
    issueKey: row.issue_key,
    issueTitle: row.issue_title,
    issueSource: row.issue_source as Run["issueSource"],
    issueUrl: row.issue_url,
    repoId: row.repo_id,
    repoSlug: row.repo_slug,
    branch: row.branch,
    worktreePath: row.worktree_path,
    phase: row.phase as Run["phase"],
    round: row.round,
    maxRounds: row.max_rounds,
    status: row.status as Run["status"],
    costUsd: row.cost_usd,
    capUsd: row.cap_usd,
    prUrl: row.pr_url ?? undefined,
    prNumber: row.pr_number ?? undefined,
    prDraft: row.pr_draft === 1,
    pauseReason: row.pause_reason ?? undefined,
    questionId: row.question_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at ?? undefined,
    finishedAt: row.finished_at ?? undefined,
  };
}
