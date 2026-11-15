import { getDb } from "../db/index.ts";
import { getSettings, patchSettings } from "../settings/index.ts";
import { seedIssues } from "./seed-issues.ts";
import { DEMO_JIRA_EMAIL, DEMO_JIRA_SITE } from "./seed-jira.ts";

export const DEMO_ISSUE_IDS = seedIssues().map((issue) => issue.id);

/** Drop leftover demo rows when Flightdeck is not in demo mode. Never deletes unmarked real data. */
export function purgeLiveDemoRows(): void {
  if (process.env.FLIGHTDECK_DEMO === "1") return;
  markLegacySeedIssues();
  clearDemoJiraSettings();
  const db = getDb();
  db.prepare("UPDATE repos SET demo = 1 WHERE local_path LIKE ?").run("%/flightdeck-demo/%");
  db.exec(`
    UPDATE changes SET demo = 1 WHERE issue_id IN (SELECT id FROM issues WHERE demo = 1);
    UPDATE change_events SET demo = 1 WHERE change_id IN (SELECT id FROM changes WHERE demo = 1);
    DELETE FROM repo_favorites WHERE demo = 1 AND NOT EXISTS (
      SELECT 1 FROM repos r WHERE r.owner = repo_favorites.owner AND r.name = repo_favorites.name AND r.demo = 0
    );
    DELETE FROM repo_recent WHERE demo = 1 AND NOT EXISTS (
      SELECT 1 FROM repos r WHERE r.owner = repo_recent.owner AND r.name = repo_recent.name AND r.demo = 0
    );
    DELETE FROM repo_favorites WHERE (owner, name) IN (SELECT owner, name FROM repos WHERE demo = 1)
      AND (owner, name) NOT IN (SELECT owner, name FROM repos WHERE demo = 0);
    DELETE FROM repo_recent WHERE (owner, name) IN (SELECT owner, name FROM repos WHERE demo = 1)
      AND (owner, name) NOT IN (SELECT owner, name FROM repos WHERE demo = 0);
    DELETE FROM pull_requests WHERE demo = 1;
    DELETE FROM pr_review_messages WHERE demo = 1 OR review_id IN (SELECT id FROM pr_reviews WHERE demo = 1);
    DELETE FROM pr_review_comments WHERE demo = 1 OR review_id IN (SELECT id FROM pr_reviews WHERE demo = 1);
    DELETE FROM pr_reviews WHERE demo = 1;
    DELETE FROM change_events WHERE demo = 1 OR change_id IN (SELECT id FROM changes WHERE demo = 1);
    DELETE FROM changes WHERE demo = 1;
    DELETE FROM shape_sessions WHERE demo = 1;
    DELETE FROM issues WHERE demo = 1;
    DELETE FROM repos WHERE demo = 1;
  `);
}

function clearDemoJiraSettings(): void {
  const settings = getSettings();
  if (settings.jiraSiteUrl !== DEMO_JIRA_SITE || settings.jiraEmail !== DEMO_JIRA_EMAIL) return;
  patchSettings({ jiraSiteUrl: "", jiraEmail: "", jiraConfigured: false });
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
