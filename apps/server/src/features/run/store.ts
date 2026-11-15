import { randomUUID } from "node:crypto";
import type { Change, ChangeAsk, ChangeEvent, ChangeStatus, Issue } from "@flightdeck/shared";
import { getDb } from "../db/index.ts";
import { localDayKey } from "./day.ts";
import { hasJob } from "./jobs.ts";
import { occupiesSlot } from "./machine.ts";

type ChangeRow = {
  id: string;
  issue_id: string;
  issue_key: string;
  issue_source: Change["issueSource"];
  issue_url: string;
  repo_slug: string;
  title: string;
  issue_body: string;
  status: ChangeStatus;
  stage: Change["stage"];
  review_round: number;
  worktree_path: string;
  branch: string;
  plan_text: string;
  cost_usd: number;
  pr_url: string | null;
  pr_number: number | null;
  scenario: string | null;
  ask_json: string | null;
  created_at: string;
  updated_at: string;
  demo?: number;
  ci_round?: number;
  ci_phase?: string;
};

type EventRow = {
  id: string;
  change_id: string;
  at: string;
  kind: ChangeEvent["kind"];
  title: string;
  detail: string | null;
  ask_json: string | null;
  cost_usd: number | null;
};

export function insertChange(
  issue: Issue,
  scenario: string,
  worktreePath: string,
  branch: string,
  status: ChangeStatus = "planning",
): Change {
  const now = new Date().toISOString();
  const change: Change = {
    id: randomUUID(),
    issueId: issue.id,
    issueKey: issue.key,
    issueSource: issue.source,
    issueUrl: issue.url,
    repoSlug: issue.repoSlug ?? "",
    title: issue.title,
    issueBody: issue.body,
    status,
    stage: "plan",
    reviewRound: 0,
    worktreePath,
    branch,
    planText: "",
    costUsd: 0,
    ciRound: 0,
    ciPhase: "",
    scenario,
    events: [],
    createdAt: now,
    updatedAt: now,
    demo: process.env.FLIGHTDECK_DEMO === "1" || issue.demo,
  };
  getDb()
    .prepare(
      `INSERT INTO changes (id, issue_id, issue_key, issue_source, issue_url, repo_slug, title, issue_body, status, stage,
        review_round, worktree_path, branch, plan_text, cost_usd, pr_url, pr_number, scenario, ask_json, created_at, updated_at, demo, ci_round, ci_phase)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      change.id,
      change.issueId,
      change.issueKey,
      change.issueSource,
      change.issueUrl,
      change.repoSlug,
      change.title,
      change.issueBody,
      change.status,
      change.stage,
      change.reviewRound,
      change.worktreePath,
      change.branch,
      change.planText,
      change.costUsd,
      null,
      null,
      change.scenario ?? null,
      null,
      change.createdAt,
      change.updatedAt,
      change.demo ? 1 : 0,
      change.ciRound,
      change.ciPhase ?? "",
    );
  return change;
}

export function getChange(id: string): Change | undefined {
  const row = getDb().prepare("SELECT * FROM changes WHERE id = ?").get(id) as ChangeRow | undefined;
  return row ? fromRow(row, loadEvents(id)) : undefined;
}

export function listChanges(): Change[] {
  const rows = getDb().prepare("SELECT * FROM changes ORDER BY updated_at DESC").all() as ChangeRow[];
  return rows.map((row) => fromRow(row, loadEvents(row.id)));
}

export function archiveAllForTests(): void {
  for (const change of listChanges()) {
    change.status = "archived";
    change.worktreePath = "";
    saveChange(change);
  }
}

export function findActiveForIssue(issueId: string): Change | undefined {
  const row = getDb()
    .prepare(
      `SELECT * FROM changes WHERE issue_id = ? AND status NOT IN ('archived','done','cap_hit','error')
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(issueId) as ChangeRow | undefined;
  return row ? fromRow(row, loadEvents(row.id)) : undefined;
}

export function saveChange(change: Change): void {
  const prev = getDb().prepare("SELECT status FROM changes WHERE id = ?").get(change.id) as { status: ChangeStatus } | undefined;
  if (prev?.status === "archived") change.status = "archived";
  change.updatedAt = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE changes SET status=?, stage=?, review_round=?, worktree_path=?, branch=?, plan_text=?, cost_usd=?,
        pr_url=?, pr_number=?, scenario=?, ask_json=?, issue_body=?, updated_at=?, ci_round=?, ci_phase=? WHERE id=?`,
    )
    .run(
      change.status,
      change.stage,
      change.reviewRound,
      change.worktreePath,
      change.branch,
      change.planText,
      change.costUsd,
      change.prUrl ?? null,
      change.prNumber ?? null,
      change.scenario ?? null,
      change.ask ? JSON.stringify(change.ask) : null,
      change.issueBody,
      change.updatedAt,
      change.ciRound,
      change.ciPhase ?? "",
      change.id,
    );
}

export function addEvent(change: Change, ev: Omit<ChangeEvent, "id" | "at"> & { at?: string }): ChangeEvent {
  const full: ChangeEvent = { ...ev, id: randomUUID(), at: ev.at ?? new Date().toISOString() };
  const parent = getDb().prepare("SELECT demo FROM changes WHERE id = ?").get(change.id) as { demo: number } | undefined;
  const demo = parent?.demo || change.demo ? 1 : 0;
  getDb()
    .prepare(
      `INSERT INTO change_events (id, change_id, at, kind, title, detail, ask_json, cost_usd, demo) VALUES (?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      full.id,
      change.id,
      full.at,
      full.kind,
      full.title,
      full.detail ?? null,
      full.ask ? JSON.stringify(full.ask) : null,
      full.costUsd ?? null,
      demo,
    );
  change.events.push(full);
  return full;
}

export function dailySpendUsd(day = localDayKey()): number {
  const rows = getDb().prepare(`SELECT at, cost_usd FROM change_events WHERE cost_usd IS NOT NULL`).all() as {
    at: string;
    cost_usd: number;
  }[];
  return rows.reduce((sum, row) => {
    const at = new Date(row.at);
    if (Number.isNaN(at.getTime()) || localDayKey(at) !== day) return sum;
    return sum + row.cost_usd;
  }, 0);
}

export function countActive(): number {
  const rows = getDb().prepare("SELECT status FROM changes").all() as { status: ChangeStatus }[];
  return rows.filter((row) => occupiesSlot(row.status)).length;
}

export function nextQueued(): Change | undefined {
  const rows = getDb()
    .prepare(
      `SELECT * FROM changes WHERE status = 'queued' OR ci_phase = 'queued' ORDER BY updated_at ASC, created_at ASC`,
    )
    .all() as ChangeRow[];
  const row = rows.find((r) => r.ci_phase === "queued" || !hasJob(r.id));
  return row ? fromRow(row, loadEvents(row.id)) : undefined;
}

function loadEvents(changeId: string): ChangeEvent[] {
  const rows = getDb().prepare("SELECT * FROM change_events WHERE change_id = ? ORDER BY at").all(changeId) as EventRow[];
  return rows.map((row) => ({
    id: row.id,
    at: row.at,
    kind: row.kind,
    title: row.title,
    detail: row.detail ?? undefined,
    ask: row.ask_json ? (JSON.parse(row.ask_json) as ChangeAsk) : undefined,
    costUsd: row.cost_usd ?? undefined,
  }));
}

function fromRow(row: ChangeRow, events: ChangeEvent[]): Change {
  return {
    id: row.id,
    issueId: row.issue_id,
    issueKey: row.issue_key,
    issueSource: row.issue_source,
    issueUrl: row.issue_url,
    repoSlug: row.repo_slug,
    title: row.title,
    issueBody: row.issue_body ?? "",
    status: row.status,
    stage: row.stage,
    reviewRound: row.review_round,
    ciRound: row.ci_round ?? 0,
    ciPhase: (row.ci_phase === "watching" || row.ci_phase === "fixing" || row.ci_phase === "queued" ? row.ci_phase : "") as Change["ciPhase"],
    worktreePath: row.worktree_path,
    branch: row.branch,
    planText: row.plan_text,
    costUsd: row.cost_usd,
    prUrl: row.pr_url ?? undefined,
    prNumber: row.pr_number ?? undefined,
    scenario: row.scenario ?? undefined,
    ask: row.ask_json ? (JSON.parse(row.ask_json) as ChangeAsk) : undefined,
    events,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    demo: Boolean(row.demo),
  };
}
