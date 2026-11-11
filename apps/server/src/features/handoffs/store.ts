import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { HandoffSchema, type Handoff, handoffToMarkdown } from "@flightdeck/shared";
import { getDb } from "../db/index.ts";

export function saveHandoff(
  runId: number,
  phase: string,
  round: number,
  json: Handoff,
  worktree?: string,
): string {
  const parsed = HandoffSchema.parse(json);
  const markdown = handoffToMarkdown(parsed);
  const createdAt = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO handoffs (run_id, phase, round, json, markdown, created_at) VALUES (?,?,?,?,?,?)`,
    )
    .run(runId, phase, round, JSON.stringify(parsed), markdown, createdAt);
  if (worktree) {
    const dir = join(worktree, ".flightdeck");
    mkdirSync(dir, { recursive: true });
    const file = join(worktree, ".flightdeck", `${phase}-r${round}.md`);
    writeFileSync(file, markdown);
    return file;
  }
  return markdown;
}

export function listHandoffs(runId: number): { phase: string; round: number; json: Handoff }[] {
  const rows = getDb()
    .prepare("SELECT phase, round, json FROM handoffs WHERE run_id = ? ORDER BY id")
    .all(runId) as { phase: string; round: number; json: string }[];
  return rows.map((r) => ({ phase: r.phase, round: r.round, json: HandoffSchema.parse(JSON.parse(r.json)) }));
}

export function latestHandoff(runId: number, phase?: string): Handoff | undefined {
  const row = (
    phase
      ? getDb()
          .prepare(
            "SELECT json FROM handoffs WHERE run_id = ? AND phase = ? ORDER BY id DESC LIMIT 1",
          )
          .get(runId, phase)
      : getDb()
          .prepare("SELECT json FROM handoffs WHERE run_id = ? ORDER BY id DESC LIMIT 1")
          .get(runId)
  ) as { json: string } | undefined;
  return row ? HandoffSchema.parse(JSON.parse(row.json)) : undefined;
}
