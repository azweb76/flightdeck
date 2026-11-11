export const MIGRATION_013 = {
  id: "013_repo_catalog",
  sql: `
    CREATE TABLE IF NOT EXISTS repo_catalog (
      owner TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      private INTEGER NOT NULL DEFAULT 0,
      default_branch TEXT NOT NULL DEFAULT 'main',
      pushed_at TEXT NOT NULL DEFAULT '',
      permission TEXT NOT NULL DEFAULT 'READ',
      fetched_at TEXT NOT NULL,
      PRIMARY KEY (owner, name)
    );
    CREATE TABLE IF NOT EXISTS repo_favorites (
      owner TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (owner, name)
    );
    CREATE TABLE IF NOT EXISTS repo_recent (
      owner TEXT NOT NULL,
      name TEXT NOT NULL,
      used_at TEXT NOT NULL,
      PRIMARY KEY (owner, name)
    );
    INSERT OR IGNORE INTO repo_favorites (owner, name, created_at)
      SELECT owner, name, created_at FROM repos WHERE pinned = 1;
  `,
};
