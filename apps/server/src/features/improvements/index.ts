import {
  SessionReviewResultSchema,
  parseAgentJson,
  type Improvement,
  type SessionFinding,
  type SessionReviewResult,
  type SessionScore,
  type StoredEvalCase,
} from "@flightdeck/shared";
import { getDb } from "../db/index.ts";
import { publish } from "../events/index.ts";
import { collectAgentOutput } from "../agent/collect.ts";
import { sessionReviewPrompt } from "../agent/prompts.ts";
import { savePromptVersion } from "../agent/prompt-versions.ts";
import { roleModel } from "../runs/execute.ts";
import { listEvents, getRun } from "../runs/store.ts";
import { patchSettings } from "../settings/index.ts";
import { evalPromptPatch } from "./eval-prompt.ts";

export function listImprovements(): Improvement[] {
  const rows = getDb().prepare("SELECT * FROM improvements ORDER BY id DESC").all() as Row[];
  return rows.map(toImp);
}

export function getSessionReview(runId: number): {
  score: SessionScore;
  findings: SessionFinding[];
  improvements: Improvement[];
} | undefined {
  const row = getDb()
    .prepare("SELECT score_json FROM session_reviews WHERE run_id = ? ORDER BY id DESC LIMIT 1")
    .get(runId) as { score_json: string } | undefined;
  if (!row) return undefined;
  const parsed = SessionReviewResultSchema.parse(JSON.parse(row.score_json));
  return {
    score: scoreOnly(parsed),
    findings: parsed.findings,
    improvements: listImprovements().filter((i) => i.runId === runId),
  };
}

export async function reviewSession(runId: number): Promise<{
  score: SessionScore;
  findings: SessionFinding[];
  improvements: Improvement[];
}> {
  const run = getRun(runId);
  if (!run) throw new Error("run not found");
  const events = listEvents(runId);
  const transcript = events.map((e) => `${e.role ?? ""} ${e.title}: ${e.detail}`).join("\n");
  const collected = await collectAgentOutput({
    prompt: sessionReviewPrompt(run.issueKey, transcript),
    cwd: run.worktreePath || process.cwd(),
    role: "session_reviewer",
    model: roleModel("session_reviewer", run),
    permissionMode: "auto",
  });
  if (collected.status !== "ok") throw new Error(collected.error ?? "session review failed");
  const parsed = parseAgentJson(collected.text, (v) => SessionReviewResultSchema.parse(v));
  getDb()
    .prepare("INSERT INTO session_reviews (run_id, score_json, created_at) VALUES (?,?,?)")
    .run(runId, JSON.stringify(parsed), new Date().toISOString());
  const created = parsed.improvements.map((imp) =>
    insertImp({
      runId,
      repoSlug: run.repoSlug,
      kind: imp.kind,
      title: imp.title,
      detail: imp.detail,
      patch: imp.patch,
      status: "proposed",
    }),
  );
  insertEvalCase(`run-${runId}-prompt`, "prompt_replay", {
    input: transcript.slice(0, 4000),
    baseline: scoreOnly(parsed),
  });
  publish("improvements.updated");
  return { score: scoreOnly(parsed), findings: parsed.findings, improvements: created };
}

export async function decideImprovement(id: number, status: Improvement["status"]): Promise<void> {
  const row = getDb().prepare("SELECT * FROM improvements WHERE id = ?").get(id) as Row | undefined;
  if (!row) return;
  let next = status;
  if (row.kind === "prompt_edit" && status === "approved") next = await applyPrompt(row);
  if (row.kind === "setting_change" && status === "approved") applySetting(row);
  if (row.kind === "claude_md_note" && status === "approved") next = "queued";
  getDb().prepare("UPDATE improvements SET status = ? WHERE id = ?").run(next, id);
  publish("improvements.updated");
}

export function loadEvalCases(): StoredEvalCase[] {
  const rows = getDb().prepare("SELECT name, kind, fixture_json FROM eval_cases").all() as {
    name: string;
    kind: string;
    fixture_json: string;
  }[];
  return rows.map((r) => ({ name: r.name, kind: r.kind, fixture: JSON.parse(r.fixture_json) as unknown }));
}

async function applyPrompt(row: Row): Promise<Improvement["status"]> {
  const replay = await evalPromptPatch(row.patch, loadEvalCases(), roleModel("session_reviewer"));
  getDb().prepare("UPDATE improvements SET eval_passed = ? WHERE id = ?").run(replay.passed ? 1 : 0, row.id);
  if (!replay.passed) return "proposed";
  savePromptVersion("implementer", row.patch);
  patchSettings({ promptImplementer: row.patch });
  return "applied";
}

function applySetting(row: Row): void {
  try {
    const patch = JSON.parse(row.patch) as { dollarCapUsd?: number };
    if (typeof patch.dollarCapUsd === "number") patchSettings({ dollarCapUsd: patch.dollarCapUsd });
  } catch {
    /* ignore bad patch */
  }
}

function insertEvalCase(name: string, kind: string, fixture: unknown): void {
  getDb()
    .prepare(`INSERT INTO eval_cases (name, kind, fixture_json, created_at) VALUES (?,?,?,?)`)
    .run(name, kind, JSON.stringify(fixture), new Date().toISOString());
}

function scoreOnly(parsed: SessionReviewResult): SessionScore {
  return {
    waste: parsed.waste,
    backtracking: parsed.backtracking,
    prQuality: parsed.prQuality,
    stuck: parsed.stuck,
    missingContext: parsed.missingContext,
    notes: parsed.notes,
  };
}

type Row = {
  id: number;
  run_id: number | null;
  repo_slug: string | null;
  kind: string;
  title: string;
  detail: string;
  patch: string;
  eval_passed: number | null;
  status: string;
  created_at: string;
};

function insertImp(input: Omit<Improvement, "id" | "createdAt">): Improvement {
  const createdAt = new Date().toISOString();
  const r = getDb()
    .prepare(
      `INSERT INTO improvements (run_id, repo_slug, kind, title, detail, patch, eval_passed, status, created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      input.runId ?? null,
      input.repoSlug ?? null,
      input.kind,
      input.title,
      input.detail,
      input.patch,
      input.evalPassed == null ? null : input.evalPassed ? 1 : 0,
      input.status,
      createdAt,
    );
  return { ...input, id: Number(r.lastInsertRowid), createdAt };
}

function toImp(row: Row): Improvement {
  return {
    id: row.id,
    runId: row.run_id ?? undefined,
    repoSlug: row.repo_slug ?? undefined,
    kind: row.kind as Improvement["kind"],
    title: row.title,
    detail: row.detail,
    patch: row.patch,
    evalPassed: row.eval_passed == null ? undefined : row.eval_passed === 1,
    status: row.status as Improvement["status"],
    createdAt: row.created_at,
  };
}
