import { defaultExec, type ExecFn } from "../exec/index.ts";
import { getDb } from "../db/index.ts";
import { publish } from "../events/index.ts";
import type { AppNotification } from "@flightdeck/shared";

export function listNotifications(): AppNotification[] {
  const rows = getDb()
    .prepare("SELECT * FROM notifications ORDER BY id DESC LIMIT 50")
    .all() as {
    id: number;
    title: string;
    body: string;
    href: string | null;
    read: number;
    created_at: string;
  }[];
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    href: r.href ?? undefined,
    read: r.read === 1,
    createdAt: r.created_at,
  }));
}

export function unreadCount(): number {
  const row = getDb().prepare("SELECT COUNT(*) AS n FROM notifications WHERE read = 0").get() as {
    n: number;
  };
  return Number(row.n);
}

export async function notify(
  title: string,
  body: string,
  href?: string,
  exec: ExecFn = defaultExec,
): Promise<void> {
  const createdAt = new Date().toISOString();
  getDb()
    .prepare("INSERT INTO notifications (title, body, href, read, created_at) VALUES (?,?,?,?,?)")
    .run(title, body, href ?? null, 0, createdAt);
  publish("notifications.updated");
  if (process.platform === "darwin") {
    await exec("osascript", [
      "-e",
      `display notification ${JSON.stringify(body)} with title ${JSON.stringify(title)}`,
    ]);
  }
}

export function markRead(id: number): void {
  getDb().prepare("UPDATE notifications SET read = 1 WHERE id = ?").run(id);
  publish("notifications.updated");
}

export function markAllRead(): void {
  getDb().prepare("UPDATE notifications SET read = 1").run();
  publish("notifications.updated");
}
