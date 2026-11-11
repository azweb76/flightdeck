export const MIGRATION_015 = {
  id: "015_next_inbox",
  sql: `
    CREATE TABLE IF NOT EXISTS inbox_state (
      id TEXT PRIMARY KEY,
      snooze_until TEXT,
      snooze_until_change INTEGER NOT NULL DEFAULT 0,
      snapshot TEXT,
      done INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
    ALTER TABLE issues ADD COLUMN labels_json TEXT;
    ALTER TABLE issues ADD COLUMN jira_priority TEXT;
  `,
};
