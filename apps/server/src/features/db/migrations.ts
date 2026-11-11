export const MIGRATIONS: { id: string; sql: string }[] = [
  {
    id: "001_init",
    sql: `
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS repos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner TEXT NOT NULL,
        name TEXT NOT NULL,
        local_path TEXT NOT NULL DEFAULT '',
        default_branch TEXT NOT NULL DEFAULT 'main',
        pinned INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        UNIQUE(owner, name)
      );
    `,
  },
  {
    id: "002_runs",
    sql: `
      ALTER TABLE repos ADD COLUMN instructions TEXT NOT NULL DEFAULT '';
      ALTER TABLE repos ADD COLUMN setup_command TEXT NOT NULL DEFAULT '';
      ALTER TABLE repos ADD COLUMN test_command TEXT NOT NULL DEFAULT '';
      ALTER TABLE repos ADD COLUMN commit_convention TEXT NOT NULL DEFAULT 'fix';
      ALTER TABLE repos ADD COLUMN model_override TEXT NOT NULL DEFAULT '';
      CREATE TABLE IF NOT EXISTS runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        issue_id TEXT NOT NULL,
        issue_key TEXT NOT NULL,
        issue_title TEXT NOT NULL,
        issue_source TEXT NOT NULL,
        issue_url TEXT NOT NULL DEFAULT '',
        repo_id INTEGER NOT NULL,
        repo_slug TEXT NOT NULL,
        branch TEXT NOT NULL,
        worktree_path TEXT NOT NULL DEFAULT '',
        phase TEXT NOT NULL,
        round INTEGER NOT NULL DEFAULT 0,
        max_rounds INTEGER NOT NULL DEFAULT 2,
        status TEXT NOT NULL,
        cost_usd REAL NOT NULL DEFAULT 0,
        cap_usd REAL NOT NULL DEFAULT 10,
        pr_url TEXT,
        pr_number INTEGER,
        pr_draft INTEGER NOT NULL DEFAULT 1,
        pause_reason TEXT,
        question_id INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        started_at TEXT,
        finished_at TEXT
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        phase TEXT NOT NULL,
        round INTEGER NOT NULL DEFAULT 0,
        sdk_session_id TEXT,
        status TEXT NOT NULL,
        tokens_in INTEGER NOT NULL DEFAULT 0,
        tokens_out INTEGER NOT NULL DEFAULT 0,
        usd REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS transcript_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER NOT NULL,
        session_id INTEGER,
        role TEXT,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        detail TEXT NOT NULL DEFAULT '',
        tool TEXT,
        path TEXT,
        tokens_in INTEGER,
        tokens_out INTEGER,
        usd REAL,
        at TEXT NOT NULL
      );
    `,
  },
  {
    id: "003_refine",
    sql: `
      CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        issue_id TEXT NOT NULL,
        original_body TEXT NOT NULL,
        markdown TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS handoffs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER NOT NULL,
        phase TEXT NOT NULL,
        round INTEGER NOT NULL,
        json TEXT NOT NULL,
        markdown TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS prompt_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        body TEXT NOT NULL,
        version INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
    `,
  },
  {
    id: "004_control",
    sql: `
      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER NOT NULL,
        prompt TEXT NOT NULL,
        options_json TEXT NOT NULL DEFAULT '[]',
        allow_free_text INTEGER NOT NULL DEFAULT 1,
        answer TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        href TEXT,
        read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS run_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER NOT NULL,
        target TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `,
  },
  {
    id: "005_reviews",
    sql: `
      CREATE TABLE IF NOT EXISTS pr_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repo_slug TEXT NOT NULL,
        pr_number INTEGER NOT NULL,
        title TEXT NOT NULL,
        files_json TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS review_drafts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        review_id INTEGER NOT NULL,
        path TEXT NOT NULL,
        line INTEGER NOT NULL,
        body TEXT NOT NULL,
        state TEXT NOT NULL
      );
    `,
  },
  {
    id: "006_evals",
    sql: `
      CREATE TABLE IF NOT EXISTS eval_cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        fixture_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS eval_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL,
        passed INTEGER NOT NULL,
        detail TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `,
  },
  {
    id: "007_session_review",
    sql: `
      CREATE TABLE IF NOT EXISTS session_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER NOT NULL,
        score_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS improvements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER,
        repo_slug TEXT,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        detail TEXT NOT NULL,
        patch TEXT NOT NULL DEFAULT '',
        eval_passed INTEGER,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `,
  },
  {
    id: "008_issues_messages",
    sql: `
      ALTER TABLE run_messages ADD COLUMN consumed INTEGER NOT NULL DEFAULT 0;
      CREATE TABLE IF NOT EXISTS issues (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        key TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL DEFAULT '',
        url TEXT NOT NULL DEFAULT '',
        parent_id TEXT,
        repos_json TEXT NOT NULL DEFAULT '[]',
        repo_warning TEXT NOT NULL DEFAULT 'none',
        updated_at TEXT NOT NULL
      );
    `,
  },
  {
    id: "009_discovery_cache",
    sql: `
      ALTER TABLE issues ADD COLUMN assigned INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE issues ADD COLUMN closed INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE issues ADD COLUMN comments_json TEXT NOT NULL DEFAULT '[]';
      CREATE TABLE IF NOT EXISTS api_cache (
        key TEXT PRIMARY KEY,
        etag TEXT,
        body TEXT NOT NULL,
        fetched_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS project_repo_picks (
        project_key TEXT PRIMARY KEY,
        owner TEXT NOT NULL,
        name TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS issue_comments (
        issue_id TEXT NOT NULL,
        comment_id TEXT NOT NULL,
        author TEXT NOT NULL DEFAULT '',
        body TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (issue_id, comment_id)
      );
    `,
  },
  {
    id: "010_ask_and_picks",
    sql: `
      ALTER TABLE questions ADD COLUMN tool_use_id TEXT;
      CREATE TABLE IF NOT EXISTS label_repo_picks (
        project_key TEXT NOT NULL,
        label TEXT NOT NULL,
        owner TEXT NOT NULL,
        name TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (project_key, label)
      );
    `,
  },
];
