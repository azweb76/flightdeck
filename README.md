# Flightdeck

Local Mac app that refines an idea into a Jira or GitHub issue with Claude, then runs the change in a worktree toward a draft PR.

See [docs/DESIGN.md](docs/DESIGN.md). v1 lives on the `v1-archive` branch.

## Run on a Mac

Need Node 22.13+ and [pnpm](https://pnpm.io/) 12.18+. GitHub uses `GITHUB_TOKEN` (or `GH_TOKEN`) if set, otherwise a personal access token in Settings. The env token is never logged or saved; git clone/push still go through `GIT_ASKPASS` with the resolved token. Claude uses `apiKeyHelper` and `ANTHROPIC_BASE_URL` from `~/.claude/settings.json`, or open a terminal, run `claude`, then type `/login`. Jira is email + API token in Settings.

```bash
pnpm install
pnpm preflight
```

`pnpm preflight` checks Node, pnpm, git (worktrees), GitHub token, Claude auth, SQLite schema, and Jira (optional). Required failures exit non-zero with a one-line fix. The same checks run when the server starts; missing tools are shown in the UI instead of crashing, unless Node is too old.

`pnpm install` also installs Playwright Chromium (needed for `pnpm check`). If browsers are missing later: `pnpm --filter @flightdeck/e2e exec playwright install chromium`.

```bash
pnpm dev
```

Open [http://127.0.0.1:47322](http://127.0.0.1:47322). The API binds to `127.0.0.1:47321`.

Demo mode (fake Claude, no git clone, seeded issues):

```bash
FLIGHTDECK_DEMO=1 pnpm dev
```

Empty demo (no seeded issues): `FLIGHTDECK_SEED=0 FLIGHTDECK_DEMO=1 pnpm dev`.

`pnpm check` runs lint, typecheck, unit tests, the web build, and Playwright flows in demo mode.
