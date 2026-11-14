# Phase 2 checklist

From `docs/DESIGN.md` (Run a change), plus Runs / Archive / caps pulled forward so a single change is operable. CI remains a placeholder.

- [x] Start on a shaped issue (one repo)
- [x] Clone into the app data folder; git worktree per change (demo fakes the worktree path)
- [x] Plan stays in the app only
- [x] Implement with tests / lint / typecheck / build gates (demo scripts a pass; live runs `pnpm`)
- [x] Fresh-context reviewer; loop up to 3 rounds then ask Dan
- [x] Agent can ask mid-run; Dan can reply
- [x] Draft PR via Octokit (demo URL); comment the PR link on the issue (GitHub Octokit / Jira client)
- [x] Change detail: stage timeline, live transcript, reply box; CI stage placeholder
- [x] Runs page + Archive (worktree removed)
- [x] Per-run and daily dollar caps
- [x] Demo scripts: question, fail-review ×3, success PR, cap hit
