# Flightdeck

Local macOS app that turns Jira Cloud or GitHub issues into pull requests using the Claude Agent SDK.

Phase 1 ships the foundation: setup wizard, GitHub/`gh` + Jira + Claude config checks, registered repos, and a read-only issues board. Agent runs, refine, and PRs come later.

One developer per machine. Data lives in `~/.flightdeck/`. Identifiers: product **Flightdeck**, slug `flightdeck`, bundle id `dev.flightdeck.app`, Keychain service `flightdeck`.

## How agents work here

This repo is written for coding agents as much as humans. Start at the short root [`CLAUDE.md`](./CLAUDE.md); it indexes per-package `CLAUDE.md` files so you only load the package you are changing. Architecture decisions are in [`docs/adr`](./docs/adr).

## Packages

| Package | Role |
| --- | --- |
| `@flightdeck/shared` | Zod schemas, label parsing, app constants |
| `@flightdeck/server` | Node HTTP API + SSE on `127.0.0.1` |
| `@flightdeck/web` | React UI (Primer) |
| `@flightdeck/desktop` | Electron main + preload |
| `eslint-plugin-flightdeck` | Cross-package import boundaries |

## Run

```bash
pnpm install
pnpm check          # typecheck, lint, tests — prints only failures
pnpm check -- --changed
pnpm check -- --filter @flightdeck/shared
pnpm dev            # server :47321 + web :47322 (browser)
pnpm dev:desktop    # Electron (macOS); expects `pnpm dev` for the UI
```

The server binds **127.0.0.1 only**. Override data dir with `FLIGHTDECK_DATA_DIR`. Set `FLIGHTDECK_DEMO=1` to show sample issue cards when Jira/`gh` are empty.

## Secrets (Jira)

On macOS the Jira API token is stored in Keychain (`security`, service `flightdeck`). On Linux, Flightdeck writes `~/.flightdeck/secrets/jira-api-token` with mode `0600`. GitHub uses your existing `gh auth login`. Claude reuses Claude Code's `apiKeyHelper` and `ANTHROPIC_BASE_URL`.

## Team config

Import a `version: 1` JSON file in the wizard (repos, `labelRules.prefix`, optional Jira JQL, plus prompts/models kept for later). Schema: `TeamConfigSchema` in `@flightdeck/shared`.
