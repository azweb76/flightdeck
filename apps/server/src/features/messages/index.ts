import { getDb } from "../db/index.ts";
import type { MidRunMessage } from "@flightdeck/shared";

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

export function takeMessages(runId: number): string[] {
  const rows = getDb()
    .prepare("SELECT id, target, text FROM run_messages WHERE run_id = ? AND consumed = 0 ORDER BY id")
    .all(runId) as { id: number; target: string; text: string }[];
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
