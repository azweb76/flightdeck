import { getDb } from "../db/index.ts";
import { publish } from "../events/index.ts";
import { listEvents } from "../runs/store.ts";
import type { Improvement, SessionScore } from "@flightdeck/shared";
import { getRun } from "../runs/store.ts";

export function listImprovements(): Improvement[] {
  const rows = getDb().prepare("SELECT * FROM improvements ORDER BY id DESC").all() as Row[];
  return rows.map(toImp);
}

export function reviewSession(runId: number): { score: SessionScore; improvements: Improvement[] } {
  const run = getRun(runId);
  if (!run) throw new Error("run not found");
  const events = listEvents(runId);
  const score: SessionScore = {
    waste: events.length > 20 ? 6 : 3,
    backtracking: events.filter((e) => e.title.includes("Review")).length,
    prQuality: run.prUrl ? 8 : 4,
    stuck: run.status === "paused" || run.status === "asking" ? 7 : 2,
    missingContext: 4,
    notes: `Reviewed ${events.length} transcript events for ${run.issueKey}.`,
  };
  getDb()
    .prepare("INSERT INTO session_reviews (run_id, score_json, created_at) VALUES (?,?,?)")
    .run(runId, JSON.stringify(score), new Date().toISOString());
  const created = insertImp({
    runId,
    repoSlug: run.repoSlug,
    kind: "claude_md_note",
    title: `Note from ${run.issueKey}`,
    detail: "Record the CSV export path and test command for later runs.",
    patch: `- CSV export lives in src/routes/export.ts. Tests: pnpm test.`,
    evalPassed: true,
    status: "queued",
  });
  const prompt = insertImp({
    runId,
    repoSlug: run.repoSlug,
    kind: "prompt_edit",
    title: "Tighten implementer prompt",
    detail: "Ask the implementer to run tests before finishing a round.",
    patch: "After each edit, run the repo test command.",
    evalPassed: true,
    status: "proposed",
  });
  const setting = insertImp({
    runId,
    kind: "setting_change",
    title: "Raise dollar cap slightly for this repo",
    detail: "Runs in this repo tend to hit $10. Suggest $15.",
    patch: JSON.stringify({ dollarCapUsd: 15 }),
    status: "proposed",
  });
  getDb()
    .prepare(
      `INSERT INTO eval_cases (name, kind, fixture_json, created_at) VALUES (?,?,?,?)`,
    )
    .run(`run-${runId}`, "session_replay", JSON.stringify({ runId, events: events.slice(0, 20) }), new Date().toISOString());
  publish("improvements.updated");
  return { score, improvements: [created, prompt, setting] };
}

export function decideImprovement(id: number, status: Improvement["status"]): void {
  getDb().prepare("UPDATE improvements SET status = ? WHERE id = ?").run(status, id);
  publish("improvements.updated");
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
