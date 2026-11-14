# preflight

In-memory snapshot: startup `runChecks()`, `GET /api/preflight` never rebuilds, `POST /api/preflight/recheck` rebuilds, GitHub token save patches the GitHub row only. `pnpm preflight` is a separate process and still runs checks. Exits non-zero on required failures. Required: Node, pnpm, git (>=2.20; worktrees since 2.5), GitHub token, Claude, SQLite schema. Optional: Jira (warn). Demo (`FLIGHTDECK_DEMO=1`) fakes pass; `FLIGHTDECK_PREFLIGHT=fail` or `POST /api/demo/preflight` shows failures. No secrets in keys or logs.
