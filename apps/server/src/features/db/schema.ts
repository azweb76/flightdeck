export const SCHEMA_VERSION = 1;

export const CREATE_SQL = `
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS issues (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    key TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT '',
    repo_slug TEXT,
    updated_at TEXT NOT NULL,
    saved INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS repos (
    owner TEXT NOT NULL,
    name TEXT NOT NULL,
    local_path TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (owner, name)
  );
  CREATE TABLE IF NOT EXISTS shape_sessions (
    id TEXT PRIMARY KEY,
    repo_slug TEXT NOT NULL,
    issue_id TEXT,
    status TEXT NOT NULL,
    draft_json TEXT NOT NULL,
    messages_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    saved_key TEXT
  );
`;

/** Column fragments for ALTER TABLE ADD COLUMN. Names must match CREATE_SQL. */
export const TABLE_COLUMNS: Record<string, { name: string; addSql: string }[]> = {
  settings: [
    { name: "key", addSql: "key TEXT" },
    { name: "value", addSql: "value TEXT NOT NULL DEFAULT ''" },
  ],
  issues: [
    { name: "id", addSql: "id TEXT" },
    { name: "source", addSql: "source TEXT NOT NULL DEFAULT ''" },
    { name: "key", addSql: "key TEXT NOT NULL DEFAULT ''" },
    { name: "title", addSql: "title TEXT NOT NULL DEFAULT ''" },
    { name: "body", addSql: "body TEXT NOT NULL DEFAULT ''" },
    { name: "url", addSql: "url TEXT NOT NULL DEFAULT ''" },
    { name: "repo_slug", addSql: "repo_slug TEXT" },
    { name: "updated_at", addSql: "updated_at TEXT NOT NULL DEFAULT ''" },
    { name: "saved", addSql: "saved INTEGER NOT NULL DEFAULT 0" },
  ],
  repos: [
    { name: "owner", addSql: "owner TEXT NOT NULL DEFAULT ''" },
    { name: "name", addSql: "name TEXT NOT NULL DEFAULT ''" },
    { name: "local_path", addSql: "local_path TEXT NOT NULL DEFAULT ''" },
  ],
  shape_sessions: [
    { name: "id", addSql: "id TEXT" },
    { name: "repo_slug", addSql: "repo_slug TEXT NOT NULL DEFAULT ''" },
    { name: "issue_id", addSql: "issue_id TEXT" },
    { name: "status", addSql: "status TEXT NOT NULL DEFAULT ''" },
    { name: "draft_json", addSql: "draft_json TEXT NOT NULL DEFAULT '{}'" },
    { name: "messages_json", addSql: "messages_json TEXT NOT NULL DEFAULT '[]'" },
    { name: "updated_at", addSql: "updated_at TEXT NOT NULL DEFAULT ''" },
    { name: "saved_key", addSql: "saved_key TEXT" },
  ],
};

export const V1_TABLES = ["schema_migrations", "runs", "transcript_events", "goals"] as const;
export const V1_ISSUE_COLUMNS = ["repos_json", "parent_id", "repo_warning"] as const;
