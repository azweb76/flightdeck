# Flightdeck

macOS app that turns Jira Cloud or GitHub issues into pull requests via the Claude Agent SDK.

Phase 1 is foundation only: local server, SQLite, auth checks, setup wizard, read-only issues board, settings.

## How agents work here

Read this file first. Then open only the package you are changing:

- `packages/shared/CLAUDE.md` — Zod schemas and label parsing
- `apps/server/CLAUDE.md` — localhost API, SQLite, integrations
- `apps/web/CLAUDE.md` — Primer React UI
- `apps/desktop/CLAUDE.md` — Electron shell
- `packages/eslint-plugin-flightdeck/CLAUDE.md` — import-boundary rules

Canonical examples:

- Route: `apps/server/src/http/routes/setup.ts`
- Service: `apps/server/src/features/setup/checks.ts`
- React: `apps/web/src/features/issues/IssueCard.tsx`
- Test: `packages/shared/src/labels.test.ts`

Rules: feature folders expose `index.ts`; files ≤300 lines; functions ≤80; web never imports server; share only `@flightdeck/shared`. `pnpm check` prints failures only. ADRs live in `docs/adr`.

Identifiers: product **Flightdeck**, slug `flightdeck`, bundle `dev.flightdeck.app`, data `~/.flightdeck/`, Keychain service `flightdeck`.
