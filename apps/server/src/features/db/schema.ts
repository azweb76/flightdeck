export const SCHEMA_VERSION = 11;

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
    saved INTEGER NOT NULL DEFAULT 0,
    demo INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS repos (
    owner TEXT NOT NULL,
    name TEXT NOT NULL,
    local_path TEXT NOT NULL DEFAULT '',
    demo INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (owner, name)
  );
  CREATE TABLE IF NOT EXISTS repo_favorites (
    owner TEXT NOT NULL,
    name TEXT NOT NULL,
    demo INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (owner, name)
  );
  CREATE TABLE IF NOT EXISTS repo_recent (
    owner TEXT NOT NULL,
    name TEXT NOT NULL,
    used_at TEXT NOT NULL,
    demo INTEGER NOT NULL DEFAULT 0,
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
    saved_key TEXT,
    demo INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS changes (
    id TEXT PRIMARY KEY,
    issue_id TEXT NOT NULL,
    issue_key TEXT NOT NULL,
    issue_source TEXT NOT NULL,
    issue_url TEXT NOT NULL DEFAULT '',
    repo_slug TEXT NOT NULL,
    title TEXT NOT NULL,
    issue_body TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL,
    stage TEXT NOT NULL,
    review_round INTEGER NOT NULL DEFAULT 0,
    worktree_path TEXT NOT NULL DEFAULT '',
    branch TEXT NOT NULL DEFAULT '',
    plan_text TEXT NOT NULL DEFAULT '',
    cost_usd REAL NOT NULL DEFAULT 0,
    pr_url TEXT,
    pr_number INTEGER,
    scenario TEXT,
    ask_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    demo INTEGER NOT NULL DEFAULT 0,
    ci_round INTEGER NOT NULL DEFAULT 0,
    ci_phase TEXT NOT NULL DEFAULT '',
    ci_pushed_at TEXT
  );
  CREATE TABLE IF NOT EXISTS pull_requests (
    id TEXT PRIMARY KEY,
    repo_slug TEXT NOT NULL,
    number INTEGER NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL DEFAULT '',
    draft INTEGER NOT NULL DEFAULT 1,
    ci TEXT NOT NULL DEFAULT 'unknown',
    review TEXT NOT NULL DEFAULT 'none',
    ci_round INTEGER NOT NULL DEFAULT 0,
    needs_you INTEGER NOT NULL DEFAULT 0,
    change_id TEXT,
    updated_at TEXT NOT NULL,
    demo INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS change_events (
    id TEXT PRIMARY KEY,
    change_id TEXT NOT NULL,
    at TEXT NOT NULL,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    detail TEXT,
    ask_json TEXT,
    cost_usd REAL,
    demo INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS pr_reviews (
    id TEXT PRIMARY KEY,
    repo_slug TEXT NOT NULL,
    number INTEGER NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL DEFAULT '',
    author TEXT NOT NULL DEFAULT '',
    head_sha TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    worktree_path TEXT NOT NULL DEFAULT '',
    skill_path TEXT NOT NULL DEFAULT '',
    cost_usd REAL NOT NULL DEFAULT 0,
    posted_event TEXT,
    selected INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    demo INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS pr_review_comments (
    id TEXT PRIMARY KEY,
    review_id TEXT NOT NULL,
    path TEXT NOT NULL,
    line INTEGER NOT NULL,
    side TEXT NOT NULL DEFAULT 'RIGHT',
    body TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'draft',
    placement TEXT NOT NULL DEFAULT 'inline',
    created_at TEXT NOT NULL,
    demo INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS pr_review_messages (
    id TEXT PRIMARY KEY,
    review_id TEXT NOT NULL,
    role TEXT NOT NULL,
    text TEXT NOT NULL,
    at TEXT NOT NULL,
    demo INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS pr_review_events (
    id TEXT PRIMARY KEY,
    review_id TEXT NOT NULL,
    at TEXT NOT NULL,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    detail TEXT,
    cost_usd REAL,
    demo INTEGER NOT NULL DEFAULT 0
  );
`;

export { TABLE_COLUMNS } from "./columns.ts";
export const V1_TABLES = ["schema_migrations", "runs", "transcript_events", "goals"] as const;
export const V1_ISSUE_COLUMNS = ["repos_json", "parent_id", "repo_warning"] as const;
