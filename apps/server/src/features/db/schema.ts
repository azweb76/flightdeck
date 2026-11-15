export const SCHEMA_VERSION = 10;

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
    { name: "demo", addSql: "demo INTEGER NOT NULL DEFAULT 0" },
  ],
  repos: [
    { name: "owner", addSql: "owner TEXT NOT NULL DEFAULT ''" },
    { name: "name", addSql: "name TEXT NOT NULL DEFAULT ''" },
    { name: "local_path", addSql: "local_path TEXT NOT NULL DEFAULT ''" },
    { name: "demo", addSql: "demo INTEGER NOT NULL DEFAULT 0" },
  ],
  repo_favorites: [
    { name: "owner", addSql: "owner TEXT NOT NULL DEFAULT ''" },
    { name: "name", addSql: "name TEXT NOT NULL DEFAULT ''" },
    { name: "demo", addSql: "demo INTEGER NOT NULL DEFAULT 0" },
  ],
  repo_recent: [
    { name: "owner", addSql: "owner TEXT NOT NULL DEFAULT ''" },
    { name: "name", addSql: "name TEXT NOT NULL DEFAULT ''" },
    { name: "used_at", addSql: "used_at TEXT NOT NULL DEFAULT ''" },
    { name: "demo", addSql: "demo INTEGER NOT NULL DEFAULT 0" },
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
    { name: "demo", addSql: "demo INTEGER NOT NULL DEFAULT 0" },
  ],
  changes: [
    { name: "id", addSql: "id TEXT" },
    { name: "issue_id", addSql: "issue_id TEXT NOT NULL DEFAULT ''" },
    { name: "issue_key", addSql: "issue_key TEXT NOT NULL DEFAULT ''" },
    { name: "issue_source", addSql: "issue_source TEXT NOT NULL DEFAULT ''" },
    { name: "issue_url", addSql: "issue_url TEXT NOT NULL DEFAULT ''" },
    { name: "repo_slug", addSql: "repo_slug TEXT NOT NULL DEFAULT ''" },
    { name: "title", addSql: "title TEXT NOT NULL DEFAULT ''" },
    { name: "issue_body", addSql: "issue_body TEXT NOT NULL DEFAULT ''" },
    { name: "status", addSql: "status TEXT NOT NULL DEFAULT ''" },
    { name: "stage", addSql: "stage TEXT NOT NULL DEFAULT ''" },
    { name: "review_round", addSql: "review_round INTEGER NOT NULL DEFAULT 0" },
    { name: "worktree_path", addSql: "worktree_path TEXT NOT NULL DEFAULT ''" },
    { name: "branch", addSql: "branch TEXT NOT NULL DEFAULT ''" },
    { name: "plan_text", addSql: "plan_text TEXT NOT NULL DEFAULT ''" },
    { name: "cost_usd", addSql: "cost_usd REAL NOT NULL DEFAULT 0" },
    { name: "pr_url", addSql: "pr_url TEXT" },
    { name: "pr_number", addSql: "pr_number INTEGER" },
    { name: "scenario", addSql: "scenario TEXT" },
    { name: "ask_json", addSql: "ask_json TEXT" },
    { name: "created_at", addSql: "created_at TEXT NOT NULL DEFAULT ''" },
    { name: "updated_at", addSql: "updated_at TEXT NOT NULL DEFAULT ''" },
    { name: "demo", addSql: "demo INTEGER NOT NULL DEFAULT 0" },
    { name: "ci_round", addSql: "ci_round INTEGER NOT NULL DEFAULT 0" },
    { name: "ci_phase", addSql: "ci_phase TEXT NOT NULL DEFAULT ''" },
    { name: "ci_pushed_at", addSql: "ci_pushed_at TEXT" },
  ],
  pull_requests: [
    { name: "id", addSql: "id TEXT" },
    { name: "repo_slug", addSql: "repo_slug TEXT NOT NULL DEFAULT ''" },
    { name: "number", addSql: "number INTEGER NOT NULL DEFAULT 0" },
    { name: "title", addSql: "title TEXT NOT NULL DEFAULT ''" },
    { name: "url", addSql: "url TEXT NOT NULL DEFAULT ''" },
    { name: "draft", addSql: "draft INTEGER NOT NULL DEFAULT 1" },
    { name: "ci", addSql: "ci TEXT NOT NULL DEFAULT 'unknown'" },
    { name: "review", addSql: "review TEXT NOT NULL DEFAULT 'none'" },
    { name: "ci_round", addSql: "ci_round INTEGER NOT NULL DEFAULT 0" },
    { name: "needs_you", addSql: "needs_you INTEGER NOT NULL DEFAULT 0" },
    { name: "change_id", addSql: "change_id TEXT" },
    { name: "updated_at", addSql: "updated_at TEXT NOT NULL DEFAULT ''" },
    { name: "demo", addSql: "demo INTEGER NOT NULL DEFAULT 0" },
  ],
  change_events: [
    { name: "id", addSql: "id TEXT" },
    { name: "change_id", addSql: "change_id TEXT NOT NULL DEFAULT ''" },
    { name: "at", addSql: "at TEXT NOT NULL DEFAULT ''" },
    { name: "kind", addSql: "kind TEXT NOT NULL DEFAULT ''" },
    { name: "title", addSql: "title TEXT NOT NULL DEFAULT ''" },
    { name: "detail", addSql: "detail TEXT" },
    { name: "ask_json", addSql: "ask_json TEXT" },
    { name: "cost_usd", addSql: "cost_usd REAL" },
    { name: "demo", addSql: "demo INTEGER NOT NULL DEFAULT 0" },
  ],
  pr_reviews: [
    { name: "id", addSql: "id TEXT" },
    { name: "repo_slug", addSql: "repo_slug TEXT NOT NULL DEFAULT ''" },
    { name: "number", addSql: "number INTEGER NOT NULL DEFAULT 0" },
    { name: "title", addSql: "title TEXT NOT NULL DEFAULT ''" },
    { name: "url", addSql: "url TEXT NOT NULL DEFAULT ''" },
    { name: "author", addSql: "author TEXT NOT NULL DEFAULT ''" },
    { name: "head_sha", addSql: "head_sha TEXT NOT NULL DEFAULT ''" },
    { name: "status", addSql: "status TEXT NOT NULL DEFAULT ''" },
    { name: "summary", addSql: "summary TEXT NOT NULL DEFAULT ''" },
    { name: "worktree_path", addSql: "worktree_path TEXT NOT NULL DEFAULT ''" },
    { name: "skill_path", addSql: "skill_path TEXT NOT NULL DEFAULT ''" },
    { name: "cost_usd", addSql: "cost_usd REAL NOT NULL DEFAULT 0" },
    { name: "posted_event", addSql: "posted_event TEXT" },
    { name: "selected", addSql: "selected INTEGER NOT NULL DEFAULT 0" },
    { name: "created_at", addSql: "created_at TEXT NOT NULL DEFAULT ''" },
    { name: "updated_at", addSql: "updated_at TEXT NOT NULL DEFAULT ''" },
    { name: "demo", addSql: "demo INTEGER NOT NULL DEFAULT 0" },
  ],
  pr_review_comments: [
    { name: "id", addSql: "id TEXT" },
    { name: "review_id", addSql: "review_id TEXT NOT NULL DEFAULT ''" },
    { name: "path", addSql: "path TEXT NOT NULL DEFAULT ''" },
    { name: "line", addSql: "line INTEGER NOT NULL DEFAULT 0" },
    { name: "side", addSql: "side TEXT NOT NULL DEFAULT 'RIGHT'" },
    { name: "body", addSql: "body TEXT NOT NULL DEFAULT ''" },
    { name: "state", addSql: "state TEXT NOT NULL DEFAULT 'draft'" },
    { name: "placement", addSql: "placement TEXT NOT NULL DEFAULT 'inline'" },
    { name: "created_at", addSql: "created_at TEXT NOT NULL DEFAULT ''" },
    { name: "demo", addSql: "demo INTEGER NOT NULL DEFAULT 0" },
  ],
  pr_review_messages: [
    { name: "id", addSql: "id TEXT" },
    { name: "review_id", addSql: "review_id TEXT NOT NULL DEFAULT ''" },
    { name: "role", addSql: "role TEXT NOT NULL DEFAULT ''" },
    { name: "text", addSql: "text TEXT NOT NULL DEFAULT ''" },
    { name: "at", addSql: "at TEXT NOT NULL DEFAULT ''" },
    { name: "demo", addSql: "demo INTEGER NOT NULL DEFAULT 0" },
  ],
};

export const V1_TABLES = ["schema_migrations", "runs", "transcript_events", "goals"] as const;
export const V1_ISSUE_COLUMNS = ["repos_json", "parent_id", "repo_warning"] as const;
