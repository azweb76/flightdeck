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
- Claude auth: use `apiKeyHelper` and the API base URL (ANTHROPIC_BASE_URL) from the user's Claude settings (`~/.claude/settings.json`); fall back to the Claude OAuth login when no `apiKeyHelper` is set.
- GitHub via the `gh` CLI login; Jira Cloud via email + API token.
- Per-run and daily dollar caps, plus a max-concurrent-agents setting.

## Screens
- Home: My issues, ready to shape or start.
- Nav pages: Issues, Runs, My PRs, Reviews, Settings.
- Change detail page: stage timeline (plan, implement, review rounds, PR, CI), live transcript, reply box.
- Goal shaping: full-page chat with the issue draft updating live beside it.
- Roomier layout with generous whitespace; follows macOS light/dark. Form inputs use a small static label above the field (GitHub style), never MUI floating/notched labels.

## Phases
Each phase is tested by Dan on his Mac before the next starts.
1. Goal shaping: app skeleton, Settings (Claude auth status, GitHub, Jira, repos), clone/fetch a chosen repo into the app's folder for read-only context, full-page chat where Claude reads the repo and asks questions, live issue draft with the six sections, save as a new Jira or GitHub issue (choose each time) or update an existing one, Issues home listing my issues.
2. Run a change: Start, worktree, plan, implement with tests/lint/typecheck/build gates, fresh-context reviewer, loop up to 3 rounds then ask, draft PR, PR link on issue; change detail page.
3. Many at once: concurrency limit, per-run and daily caps, Runs page, Archive button.
4. CI and My PRs: watch CI and auto-fix up to 3 attempts then ask; My PRs page.
5. Reviews: select PRs to review, Review button, worktree at the PR commit, repo review skill or built-in default, summary plus drafted comments, approve/edit and post as one review with a verdict, chat about the PR.
