import { getDb } from "../db/index.ts";
import { seedIssues } from "./seed-issues.ts";

export const DEMO_ISSUE_IDS = seedIssues().map((issue) => issue.id);

/** Drop leftover demo seed rows when Flightdeck is not in demo mode. Never deletes unmarked real data. */
export function purgeLiveDemoRows(): void {
  if (process.env.FLIGHTDECK_DEMO === "1") return;
  const db = getDb();
  for (const id of DEMO_ISSUE_IDS) {
    db.prepare("UPDATE issues SET demo = 1 WHERE id = ?").run(id);
  }
  db.prepare("UPDATE repos SET demo = 1 WHERE local_path LIKE ?").run("%/flightdeck-demo/%");
  db.exec("DELETE FROM issues WHERE demo = 1; DELETE FROM repos WHERE demo = 1;");
}
