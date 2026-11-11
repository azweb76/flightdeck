import {
  SessionScoreSchema,
  parseAgentJson,
  type Improvement,
  type SessionScore,
} from "@flightdeck/shared";
import { getDb } from "../db/index.ts";
import { publish } from "../events/index.ts";
import { collectAgentOutput } from "../agent/collect.ts";
import { roleModel } from "../runs/execute.ts";
import { listEvents, getRun } from "../runs/store.ts";
import { patchSettings } from "../settings/index.ts";

export function listImprovements(): Improvement[] {
  const rows = getDb().prepare("SELECT * FROM improvements ORDER BY id DESC").all() as Row[];
  return rows.map(toImp);
}

export function getSessionReview(runId: number): { score: SessionScore; improvements: Improvement[] } | undefined {
  const row = getDb()
    .prepare("SELECT score_json FROM session_reviews WHERE run_id = ? ORDER BY id DESC LIMIT 1")
    .get(runId) as { score_json: string } | undefined;
  if (!row) return undefined;
  return {
    score: SessionScoreSchema.parse(JSON.parse(row.score_json)),
    improvements: listImprovements().filter((i) => i.runId === runId),
  };
}

export async function reviewSession(runId: number): Promise<{ score: SessionScore; improvements: Improvement[] }> {
  const run = getRun(runId);
  if (!run) throw new Error("run not found");
  const events = listEvents(runId);
  const collected = await collectAgentOutput({
    prompt: sessionPrompt(run.issueKey, events.length),
    cwd: run.worktreePath || process.cwd(),
    role: "session_reviewer",
    model: roleModel("session_reviewer", run),
    permissionMode: "auto",
  });
  const score = scoreFrom(collected.text, events.length, run.status, Boolean(run.prUrl));
  getDb()
    .prepare("INSERT INTO session_reviews (run_id, score_json, created_at) VALUES (?,?,?)")
    .run(runId, JSON.stringify(score), new Date().toISOString());
  const created = seedImprovements(runId, run.repoSlug, score);
  getDb()
    .prepare(`INSERT INTO eval_cases (name, kind, fixture_json, created_at) VALUES (?,?,?,?)`)
    .run(
      `run-${runId}`,
      "session_replay",
      JSON.stringify({ runId, events: events.slice(0, 40), score }),
      new Date().toISOString(),
    );
  publish("improvements.updated");
  return { score, improvements: created };
}

export function decideImprovement(id: number, status: Improvement["status"]): void {
  const row = getDb().prepare("SELECT * FROM improvements WHERE id = ?").get(id) as Row | undefined;
  if (!row) return;
  let next = status;
  if (row.kind === "prompt_edit" && status === "approved") next = applyPrompt(row);
  if (row.kind === "setting_change" && status === "approved") applySetting(row);
  if (row.kind === "claude_md_note" && status === "approved") next = "queued";
  getDb().prepare("UPDATE improvements SET status = ? WHERE id = ?").run(next, id);
  publish("improvements.updated");
}

function applyPrompt(row: Row): Improvement["status"] {
  const evalOk = typeof row.patch === "string" && row.patch.trim().length > 0;
  getDb().prepare("UPDATE improvements SET eval_passed = ? WHERE id = ?").run(evalOk ? 1 : 0, row.id);
  if (!evalOk) return "proposed";
  getDb()
    .prepare("INSERT INTO prompt_versions (role, body, version, created_at) VALUES (?,?,?,?)")
    .run("implementer", row.patch, Date.now(), new Date().toISOString());
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

function seedImprovements(runId: number, repoSlug: string, score: SessionScore): Improvement[] {
  return [
    insertImp({
      runId,
      repoSlug,
      kind: "claude_md_note",
      title: `Note from run ${runId}`,
      detail: score.notes,
      patch: score.notes,
      evalPassed: true,
      status: "queued",
    }),
    insertImp({
      runId,
      repoSlug,
      kind: "prompt_edit",
      title: "Tighten implementer prompt",
      detail: "Run tests before finishing a round.",
      patch: "After each edit, run the repo test command.",
      evalPassed: true,
      status: "proposed",
    }),
    insertImp({
      runId,
      kind: "setting_change",
      title: "Dollar cap",
      detail: "Raise cap if waste is high.",
      patch: JSON.stringify({ dollarCapUsd: 15 }),
      status: "proposed",
    }),
  ];
}

function sessionPrompt(key: string, n: number): string {
  return [
    "Score this Flightdeck session 0-10 for waste, backtracking, prQuality, stuck, missingContext.",
    `Issue ${key}, ${n} transcript events.`,
    'Reply JSON: {"waste":3,"backtracking":1,"prQuality":8,"stuck":2,"missingContext":4,"notes":"..."}',
  ].join("\n");
}

function scoreFrom(text: string, events: number, status: string, hasPr: boolean): SessionScore {
  try {
    return parseAgentJson(text, (v) => SessionScoreSchema.parse(v));
  } catch {
    return {
      waste: events > 20 ? 6 : 3,
      backtracking: 1,
      prQuality: hasPr ? 8 : 4,
      stuck: status === "paused" || status === "asking" ? 7 : 2,
      missingContext: 4,
      notes: "Fallback score; agent JSON missing.",
    };
  }
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
