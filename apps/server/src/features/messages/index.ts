import { getDb } from "../db/index.ts";
import type { MidRunMessage } from "@flightdeck/shared";

export type InjectMode = "start" | "resume";

export function listMessages(runId: number): (MidRunMessage & { id: number; consumed: boolean })[] {
  const rows = getDb()
    .prepare("SELECT id, target, text, consumed FROM run_messages WHERE run_id = ? ORDER BY id")
    .all(runId) as { id: number; target: MidRunMessage["target"]; text: string; consumed: number }[];
  return rows.map((r) => ({
    id: r.id,
    target: r.target,
    text: r.text,
    consumed: r.consumed === 1,
  }));
}

export function pendingFor(runId: number, target: MidRunMessage["target"] | "any"): string[] {
  const rows =
    target === "any"
      ? (getDb()
          .prepare("SELECT id, text FROM run_messages WHERE run_id = ? AND consumed = 0")
          .all(runId) as { id: number; text: string }[])
      : (getDb()
          .prepare(
            "SELECT id, text FROM run_messages WHERE run_id = ? AND consumed = 0 AND (target = ? OR target = 'run')",
          )
          .all(runId, target) as { id: number; text: string }[]);
  return rows.map((r) => r.text);
}

/** resume = current phase; start = next phase (also drains leftover current so it is not lost). */
export function takeMessages(runId: number, mode: InjectMode = "start"): string[] {
  const rows = getDb()
    .prepare("SELECT id, target, text FROM run_messages WHERE run_id = ? AND consumed = 0 ORDER BY id")
    .all(runId) as { id: number; target: string; text: string }[];
  const allow = mode === "resume" ? new Set(["current", "run"]) : new Set(["next", "current", "run"]);
  const picked = rows.filter((r) => allow.has(r.target));
  if (mode === "start") {
    const nextOnly = picked.filter((r) => r.target === "next" || r.target === "run" || r.target === "current");
    return consume(nextOnly);
  }
  return consume(picked.filter((r) => r.target === "current" || r.target === "run"));
}

function consume(rows: { id: number; target: string; text: string }[]): string[] {
  const texts = rows.map((r) => `[${r.target}] ${r.text}`);
  for (const r of rows) {
    if (r.target === "run") continue;
    getDb().prepare("UPDATE run_messages SET consumed = 1 WHERE id = ?").run(r.id);
  }
  return texts;
}

export function insertMessage(runId: number, msg: MidRunMessage): void {
  getDb()
    .prepare("INSERT INTO run_messages (run_id, target, text, created_at, consumed) VALUES (?,?,?,?,0)")
    .run(runId, msg.target, msg.text, new Date().toISOString());
}
