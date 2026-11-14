# Flightdeck v2 design

Decided with Dan on 12 Nov 2026. The previous version is archived on the `v1-archive` branch.

## Goal
A local app on my Mac where I go from an idea to a draft PR with Claude, across many repos at once. I shape the goal with Claude, using the GitHub repo for context, and save it as a Jira or GitHub issue. Then an agent works hands-off in its own worktree: it plans, implements, reviews its own work and fixes it up to 3 times, then opens a draft PR. It only stops to ask me when it's stuck. When I'm asked to review someone's PR, Claude gives me a summary and drafts review comments, and nothing gets posted until I approve it.

- Runs on: Dan's Mac, local agents (Claude Agent SDK)
- Form: desktop or local web app
- Trackers: Jira Cloud and GitHub Issues
- Code host: GitHub

## Flow

```mermaid
flowchart TD
  start[Idea or existing issue] --> shape[Shape with Claude<br/>repo as context]
  shape --> save[Save issue<br/>Jira or GitHub]
  save --> wait[Dan clicks Start]
  wait --> plan[Plan]
  plan --> impl[Implement<br/>tests, lint, typecheck, build]
  impl --> review[Fresh reviewer]
  review -->|changes needed<br/>max 3 rounds| impl
  review -->|round 3 fails| askReview[Ask Dan]
  review -->|approval| pr[Draft PR<br/>link commented on issue]
  pr --> ci[Watch CI]
  ci -->|failures<br/>auto-fix up to 3 attempts| ci
  ci -->|3 attempts fail| askCi[Ask Dan]
  ci -->|pass| done[Done]
```

## 1. Shaping a goal into an issue
- Start from a new idea in a chosen repo, or an existing Jira or GitHub issue to refine.
- Back-and-forth chat: Claude reads the repo, asks questions, then drafts the issue.
- Issue contents: goal and background, acceptance criteria, relevant files and code areas, suggested implementation approach, out of scope, test plan.
- Dan picks Jira or GitHub each time.
- After saving, it waits until Dan clicks Start.

## 2. Running a change
1. Plan: the agent writes a plan in its worktree. The plan stays in the app only.
2. Implement: the repo's tests, lint, typecheck and build must all pass before review.
3. Review: a separate Claude session with fresh context reviews the diff and checks every acceptance criterion.
4. Loop: implement and review repeat up to 3 rounds. If round 3 still fails, stop and ask Dan.
5. Draft PR: open a draft PR and comment the PR link on the issue.
6. CI: watch CI and fix failures automatically, up to 3 attempts, then ask Dan.
Throughout, the agent is hands-off but can pause and ask Dan a question when stuck.

## 3. Many changes at once
- A max number of concurrent agents, set in Settings.
- Every change runs in its own git worktree, including several on the same repo.
- The app clones repos into its own folder and manages worktrees.
- One repo per issue.
- An Archive button removes the worktree when done.

## 4. Reviewing others' PRs
- Kept separate from Dan's own changes and PRs.
- Dan selects which PRs he's reviewing.
- Claude reviews only when Dan clicks Review.
- Creates a worktree at the PR's commit and runs an agent using the repo's own review skill, or a built-in default review (bugs, tests, security, acceptance criteria) when the repo has none.
- Output: a summary plus drafted line comments.
- Dan approves or edits each comment, then posts them together as one review with a verdict he picks.
- Dan can chat with Claude about the PR.

## Stack
- Local web app opened in the browser (Node server bound to 127.0.0.1).
- TypeScript Node backend with the Claude Agent SDK; React frontend with MUI.
- SQLite at `~/.flightdeck/app.sqlite`. Schema version is `PRAGMA user_version`. Startup creates missing tables and `ALTER TABLE`s missing columns (checked with `PRAGMA table_info`). An incompatible v1 database is renamed to `app.sqlite.v1-backup-<timestamp>` and replaced with a fresh v2 file — never deleted silently.
- Claude auth: use `apiKeyHelper` and the API base URL (ANTHROPIC_BASE_URL) from the user's Claude settings (`~/.claude/settings.json`); fall back to the Claude OAuth login when no `apiKeyHelper` is set.
- GitHub via `GITHUB_TOKEN` (then `GH_TOKEN`) in the environment, else a personal access token in Settings (Octokit; git CLI still does clone/fetch/worktree/commit/push via `GIT_ASKPASS` with the resolved token). The env token is never logged or written to the keychain. Jira Cloud via email + API token.
- Per-run and daily dollar caps, plus a max-concurrent-agents setting.

## Caching
Live GitHub, Jira and Claude calls are keyed TTL caches with in-flight dedupe (`features/cache`). Failed loads are not cached. Demo mode never calls the live trackers.

| Call | TTL | Invalidation |
|---|---|---|
| Issues tracker sync (`GET /api/issues`) | 60s | `POST /api/issues/sync` (Refresh) forces a sync |
| GitHub `GET /user` (token status) | 2 min | Settings token save/disconnect |
| GitHub assigned issues search (paginated, 100 per page) | 60s | Refresh; after GitHub issue create/update |
| GitHub `GET /user/repos` | 5 min | — |
| Jira JQL search | 60s | Jira settings save/connect; after Jira create/update; Refresh |
| Jira connect `myself` | 2 min | Jira settings save/connect; after Jira create/update |
| `detectClaudeConfig` (including apiKeyHelper) | 2 min | Settings save; Settings Re-check |
| `git fetch origin` | 60s | TTL only |

`issues.updated` is published only when a sync ran and data changed, or after save / setIssueRepo — never on a GET cache hit, so the Issues page can refetch the store without looping into GitHub/Jira. On HTTP 429 (Jira `Retry-After`) or GitHub 403/429 (`Retry-After`, `x-ratelimit-reset`, secondary rate limit), Octokit throttle plugins do not wait: they throw immediately so `withBackoff` owns every retry, capped at 30s, and the UI gets `… is rate limiting, retrying in Ns`. Live GitHub/Jira rate limits were not hit while building this; the behaviour is covered by unit tests with fake 429s.

## Preflight
Startup and `pnpm preflight` run the same checks. Required failures print a one-line fix and do not crash the server (the UI can show them), except Node itself being below `package.json` `engines`. The server keeps an in-memory snapshot: `runChecks()` on startup, `GET /api/preflight` returns it and never rebuilds, `POST /api/preflight/recheck` rebuilds, and saving a GitHub token patches only the GitHub row. `pnpm preflight` is a separate process and still runs the checks. Cache keys and logs never include secrets.

| Check | Required? | Pass when | Fix if not |
|---|---|---|---|
| Node.js | required | `process.versions.node` satisfies `engines.node` | `brew install node@22` |
| pnpm | required | `pnpm --version` satisfies `engines.pnpm` | `corepack enable` |
| git | required | `git --version` >= 2.20 (semver compare; Apple Git suffixes ignored). Worktrees shipped in 2.5; `git worktree -h` exit 129 is usage, not missing. | `brew install git` |
| GitHub token | required | `GITHUB_TOKEN` or `GH_TOKEN` or a stored PAT; `GET /user` succeeds; classic scopes include repo, read:org, workflow (fine-grained noted if no scope header). Report names the source. | Set `GITHUB_TOKEN` or add a GitHub token in Settings |
| Claude auth | required | `apiKeyHelper` (and it runs), API key env, or OAuth credentials | `claude` then `/login` |
| SQLite schema | required | `PRAGMA user_version` matches and columns exist | Pull latest and restart |
| Jira | optional | skipped if unset; warn if configured without a working token | Add a Jira API token in Settings |

Demo mode (`FLIGHTDECK_DEMO=1`) fakes every check passing except the real local SQLite file. `FLIGHTDECK_PREFLIGHT=fail` or `POST /api/demo/preflight` `{ "fixture": "fail" }` paints a failing report (and matching Claude/GitHub/Jira Settings cards) for screenshots and e2e. The Issues banner lists required failures with a high-contrast error alert and a Re-check button. Settings → Dependencies lists every check and also has Re-check. Shape / Save to GitHub / Start disable only when that dependency failed. Save picks GitHub/Jira from readable cards that explain why a tracker is blocked, not ghosted menu items.

## Screens
- Home: My issues, ready to shape or start.
- Nav pages: Issues, Runs, My PRs, Reviews, Settings.
- Change detail page: stage timeline (plan, implement, review rounds, PR, CI), live transcript, reply box.
- Goal shaping: full-page chat with the issue draft updating live beside it.
- Roomier layout with generous whitespace; follows macOS light/dark. Form inputs use a small static label above the field (GitHub style), never MUI floating/notched labels.

## Phases
Each phase is tested by Dan on his Mac before the next starts.
1. Goal shaping (**done**): app skeleton, Settings (Claude auth status, GitHub, Jira, repos), clone/fetch a chosen repo into the app's folder for read-only context, full-page chat where Claude reads the repo and asks questions, live issue draft with the six sections, save as a new Jira or GitHub issue (choose each time) or update an existing one, Issues home listing my issues.
2. Run a change (**done in demo; live adapters wired, not live-run here**): Start, worktree, plan, implement with tests/lint/typecheck/build gates, fresh-context reviewer, loop up to 3 rounds then ask, draft PR, PR link on issue; change detail page. Caps, Runs page, and Archive are pulled forward from Phase 3 so a single change is operable. CI on the timeline is a Phase 4 placeholder.
3. Many at once: concurrency limit across several agents (setting exists; simple guard is in), polish for parallel Runs.
4. CI and My PRs: watch CI and auto-fix up to 3 attempts then ask; My PRs page.
5. Reviews: select PRs to review, Review button, worktree at the PR commit, repo review skill or built-in default, summary plus drafted comments, approve/edit and post as one review with a verdict, chat about the PR.
