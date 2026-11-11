# @flightdeck/server

Localhost-only HTTP API (`127.0.0.1`) plus SSE. Electron and `pnpm dev` both start this process.

- Public surface: `src/http/app.ts` and `src/index.ts`.
- Feature folders expose `index.ts` only.
- Canonical route: `src/http/routes/setup.ts`
- Canonical service: `src/features/setup/checks.ts`
- Canonical tests: `src/features/setup/checks.test.ts`, `src/features/claude/claude.test.ts`
- Storage: SQLite via `node:sqlite` under `~/.flightdeck/` (override with `FLIGHTDECK_DATA_DIR`).
- Jira token: Keychain service `flightdeck` (Linux: `~/.flightdeck/secrets/`).
- Runner: `src/features/runs/` (parallel drain, per-run worktrees `agent/run-<id>`, daily spend cap, Interrupted on boot). Canonical tests: `src/features/runs/parallel.test.ts`.
- Board PRs: `src/features/board-prs/` (GraphQL search with `viewer.login` in `author:` / `review-requested:` / `reviewed-by:`, plus merged/closed last 7 days). Unlinked PRs are `/prs`, not Issues cards. Diagnostics: `GET /api/prs/diagnostics`. Canonical tests: `src/features/board-prs/search.test.ts`.
- Repo catalog: `src/features/catalog/` (gh-accessible repos, 1h SQLite cache, favorites/recent). Discovery is not limited to a configured repo list.
- Agent drivers: `src/features/agent/` (Claude Agent SDK by default; fake only when `FLIGHTDECK_AGENT=fake` or `FLIGHTDECK_DEMO=1`).
- Jira Cloud search is POST `/rest/api/3/search/jql` with `nextPageToken` (legacy `/search` 400s). Incremental JQL keeps `ORDER BY` last and quotes `"yyyy-MM-dd HH:mm"`. Surface `errorMessages` in sync errors. HTTP 4xx is not offline.
- Do not import `apps/web` or `apps/desktop`.
