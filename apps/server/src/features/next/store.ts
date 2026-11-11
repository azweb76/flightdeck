import { getDb } from "../db/index.ts";

export type InboxState = {
  id: string;
  snoozeUntil?: string;
  snoozeUntilChange: boolean;
  snapshot?: string;
  done: boolean;
};

export function getInboxState(id: string): InboxState | undefined {
  const row = getDb().prepare("SELECT * FROM inbox_state WHERE id = ?").get(id) as
    | {
        id: string;
        snooze_until: string | null;
        snooze_until_change: number;
        snapshot: string | null;
        done: number;
      }
    | undefined;
  if (!row) return undefined;
  return {
    id: row.id,
    snoozeUntil: row.snooze_until ?? undefined,
    snoozeUntilChange: row.snooze_until_change === 1,
    snapshot: row.snapshot ?? undefined,
    done: row.done === 1,
  };
}

export function upsertInboxState(next: InboxState): void {
  getDb()
    .prepare(
      `INSERT INTO inbox_state (id, snooze_until, snooze_until_change, snapshot, done, updated_at)
       VALUES (?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         snooze_until=excluded.snooze_until,
         snooze_until_change=excluded.snooze_until_change,
         snapshot=excluded.snapshot,
         done=excluded.done,
         updated_at=excluded.updated_at`,
    )
    .run(
      next.id,
      next.snoozeUntil ?? null,
      next.snoozeUntilChange ? 1 : 0,
      next.snapshot ?? null,
      next.done ? 1 : 0,
      new Date().toISOString(),
    );
}

export function hiddenByInbox(id: string, snapshot: string, now = new Date()): boolean {
  const row = getInboxState(id);
  if (!row) return false;
  if (row.done) return true;
  if (row.snoozeUntil && row.snoozeUntil > now.toISOString()) return true;
  if (row.snoozeUntilChange && row.snapshot === snapshot) return true;
  return false;
}
