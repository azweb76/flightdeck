# Flightdeck

macOS app that turns Jira Cloud or GitHub issues into pull requests via the Claude Agent SDK.

Phases 1–7 are in this repo: setup, runs, refine/orchestration, control, extra entry points, polish, session review.

## How agents work here

Read this file first. Then open only the package you are changing:

- `packages/shared/CLAUDE.md` — Zod schemas and label parsing
- `apps/server/CLAUDE.md` — localhost API, SQLite, integrations, runner
- `apps/web/CLAUDE.md` — Primer React UI
- `apps/desktop/CLAUDE.md` — Electron shell
- `packages/eslint-plugin-flightdeck/CLAUDE.md` — import-boundary rules
- `packages/evals/CLAUDE.md` — prompt eval harness

Canonical examples:

- Route: `apps/server/src/http/routes/setup.ts`
- Service: `apps/server/src/features/setup/checks.ts`
- Agent driver: `apps/server/src/features/agent/index.ts`
- React: `apps/web/src/features/issues/IssueCard.tsx`
- Test: `packages/shared/src/labels.test.ts`

Rules: feature folders expose `index.ts`; files ≤300 lines; functions ≤80; web never imports server; share only `@flightdeck/shared`. `pnpm check` prints failures only. ADRs live in `docs/adr`.

Tooling: `packageManager` pins pnpm 12.18.0. `pnpm-workspace.yaml` sets `minimumReleaseAge: 1440`, so installs only resolve versions published more than 24 hours ago.

Identifiers: product **Flightdeck**, slug `flightdeck`, bundle `dev.flightdeck.app`, data `~/.flightdeck/`, Keychain service `flightdeck`.

Defaults: label `gh:owner/repo`, draft PRs, 2 review rounds, $10 run cap, 2 concurrent agents, SDK `permissionMode: "auto"`. Demo: `FLIGHTDECK_DEMO=1`. Real SDK: `FLIGHTDECK_AGENT=sdk`.
