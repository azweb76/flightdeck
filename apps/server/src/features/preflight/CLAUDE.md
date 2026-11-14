# preflight

`GET /api/preflight` (`?refresh=1` or `POST /api/preflight/recheck` bypasses the 30s cache). `pnpm preflight` exits non-zero on required failures. Required: Node, pnpm, git (>=2.20; worktrees since 2.5), GitHub token, Claude, SQLite schema. Optional: Jira (warn). Demo (`FLIGHTDECK_DEMO=1`) fakes pass; `FLIGHTDECK_PREFLIGHT=fail` or `POST /api/demo/preflight` shows failures. No secrets in keys or logs.
