import { getDb } from "../db/index.ts";
import { seedIssues } from "./seed-issues.ts";

export const DEMO_ISSUE_IDS = seedIssues().map((issue) => issue.id);

/** Drop leftover demo rows when Flightdeck is not in demo mode. Never deletes unmarked real data. */
export function purgeLiveDemoRows(): void {
  if (process.env.FLIGHTDECK_DEMO === "1") return;
  const db = getDb();
  markLegacySeedIssues();
  db.prepare("UPDATE repos SET demo = 1 WHERE local_path LIKE ?").run("%/flightdeck-demo/%");
  db.exec(`
    DELETE FROM change_events WHERE change_id IN (SELECT id FROM changes WHERE demo = 1);
    DELETE FROM changes WHERE demo = 1;
    DELETE FROM shape_sessions WHERE demo = 1;
    DELETE FROM issues WHERE demo = 1;
    DELETE FROM repos WHERE demo = 1;
  `);
}

function markLegacySeedIssues(): void {
  const db = getDb();
  for (const seed of seedIssues()) {
    const row = db.prepare("SELECT source, title, url FROM issues WHERE id = ? AND demo = 0").get(seed.id) as
      | { source: string; title: string; url: string }
      | undefined;
    if (!row) continue;
    if (row.source === seed.source && row.title === seed.title && row.url === seed.url) {
      db.prepare("UPDATE issues SET demo = 1 WHERE id = ?").run(seed.id);
    }
  }
}
