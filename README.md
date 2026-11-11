# Flightdeck

Local macOS app that turns Jira Cloud or GitHub issues into pull requests using the Claude Agent SDK.

One developer per machine. Data lives in `~/.flightdeck/`. Identifiers: product **Flightdeck**, slug `flightdeck`, bundle id `dev.flightdeck.app`, Keychain service `flightdeck`.

## How agents work here

Start at [`CLAUDE.md`](./CLAUDE.md). It indexes per-package `CLAUDE.md` files so you only load the package you are changing. ADRs are in [`docs/adr`](./docs/adr).

The app owns the loop: refine → approve goal → plan → implement → review for N rounds (default 2). Each phase is an SDK session. Handoffs are Zod JSON in SQLite and markdown in the worktree. Full transcripts and token/cost are stored from the first run.

## Packages

| Package | Role |
| --- | --- |
| `@flightdeck/shared` | Zod schemas, labels, PR body, cost |
| `@flightdeck/server` | Node HTTP API + SSE + runner on `127.0.0.1` |
| `@flightdeck/web` | React UI (Primer) |
| `@flightdeck/desktop` | Electron main + preload |
| `@flightdeck/evals` | Prompt eval harness |
| `eslint-plugin-flightdeck` | Cross-package import boundaries |

## Run

```bash
pnpm install
pnpm check
pnpm dev            # server :47321 + web :47322
FLIGHTDECK_DEMO=1 pnpm dev   # sample board, fake agent, seed run
pnpm dev:desktop
```

Real agent: `FLIGHTDECK_AGENT=sdk` (needs Claude Code config). Fake agent is the default in this repo's tests and demo.

The server binds **127.0.0.1 only**. `FLIGHTDECK_DATA_DIR` overrides `~/.flightdeck`.

## Defaults

- Jira repo labels: `gh:owner/repo` (prefix configurable)
- PRs open as **drafts**
- Review rounds: **2**
- Dollar cap: **$10** / run
- Max concurrency: **2**
- SDK permission mode: **auto**, plus a Bash deny-list

## Packaging

Homebrew cask template: `packaging/homebrew/flightdeck.rb`. electron-builder config: `packaging/electron-builder.yml`.

## Token/cost in CI

`pnpm --filter @flightdeck/evals test` is the prompt eval harness. Session reviews write eval cases into SQLite; a future CI job comments cost from `transcript_events.usd` onto the PR.

## License

MIT, see [LICENSE](./LICENSE).
