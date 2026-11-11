# @flightdeck/server

Localhost-only HTTP API (`127.0.0.1`) plus SSE. Electron and `pnpm dev` both start this process.

- Public surface: `src/http/app.ts` and `src/index.ts`.
- Feature folders expose `index.ts` only.
- Canonical route: `src/http/routes/setup.ts`
- Canonical service: `src/features/setup/checks.ts`
- Canonical tests: `src/features/setup/checks.test.ts`, `src/features/claude/claude.test.ts`
- Storage: SQLite via `node:sqlite` under `~/.flightdeck/` (override with `FLIGHTDECK_DATA_DIR`).
- Jira token: Keychain service `flightdeck` (Linux: `~/.flightdeck/secrets/`).
- Runner: `src/features/runs/` (start, orchestrate, execute, PR).
- Agent drivers: `src/features/agent/` (Claude Agent SDK by default; fake only when `FLIGHTDECK_AGENT=fake` or `FLIGHTDECK_DEMO=1`).
- Do not import `apps/web` or `apps/desktop`.
