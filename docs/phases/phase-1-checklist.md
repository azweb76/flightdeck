# Phase 1 checklist

From `docs/DESIGN.md` (Goal shaping). Each line is **Done** with proof (demo vs real) or **Missing**.

- [x] **Done** Local web app; Node server bound to 127.0.0.1 — `apps/server/src/index.ts`; e2e health; `issues-light.png`
- [x] **Done (real adapter, not live-run here)** TypeScript Node backend with the Claude Agent SDK — `apps/server/src/features/agent/sdk.ts`; `sdk.test.ts`. Live SDK turns not run on this machine.
- [x] **Done** React frontend with MUI — `apps/web`; screenshots
- [x] **Done (unit)** Claude auth reads `apiKeyHelper` and `ANTHROPIC_BASE_URL` from `~/.claude/settings.json` — `claude.test.ts`. Demo Settings card shows a fake ready status (`settings-light.png`).
- [x] **Done (detect + instructions, not a 5s subprocess)** Claude OAuth: credentials file counts as logged in (`claude.test.ts`); Settings “How to log in” prints `claude` then `/login`. Demo mode still fakes Ready.
- [x] **Done (real adapter, demo status in UI)** GitHub via `gh` — `github.test.ts` (exact `gh issue create` args, URL parse). Demo Settings shows `dan-demo`.
- [x] **Done (real adapter, demo connect in UI)** Jira Cloud email + token — `jira.test.ts`; form + Atlassian link `settings-light.png`. Demo connect success is a success Alert (not a page-level error); failed connect clears Connected (`settings-jira-error-dark.png`). Real Jira `myself` not live-run here.
- [x] **Done** Per-run / daily / max-concurrent caps in Settings — `settings.test.ts`; e2e blur-save; invalid cap error clears on edit (`phase1.spec.ts`); `settings-light.png`
- [x] **Done** Home is My issues — e2e; `issues-light.png`. **GET /api/issues calls `syncIssues`**; Refresh button. Demo: seed list. Real: `gh` assigned + Jira JQL (not live-run here).
- [x] **Done** Nav: Issues, Runs, My PRs, Reviews, Settings — e2e; placeholder screenshots
- [x] **Done** Full-page shaping: chat + draft share the viewport, independent scroll; stacked below `lg` (1024 stacked, 1440 side-by-side) — `shape-draft-light.png` `shape-draft-narrow.png`
- [x] **Done** Live draft/chat over SSE (`useAppEvents` + `shape.updated` payload) and after each HTTP turn — `apps/web/src/useAppEvents.ts`
- [x] **Done** Roomier layout — screenshots
- [x] **Done** macOS light and dark — `issues-light/dark.png` `shape-draft-dark.png` `settings-dark.png`
- [x] **Done** Static labels (FormField); chat Reply labeled — `shape-asking-light.png` `settings-light.png`
- [x] **Done** Settings Claude / GitHub / Jira / repos — e2e; screenshots. GitHub login hint only when logged out.
- [x] **Done (demo skip git; real clone/fetch implemented)** Clone/fetch — `clone.test.ts` demo path; `ensureClone` git fetch/clone when not demo (not live-run here)
- [x] **Done (demo fake derives from idea; real AskUserQuestion allowed)** Shaping asks + six-section draft — fake.test + e2e dark-mode idea; `sdk.ts` `SHAPE_TOOLS` includes AskUserQuestion; `canUseShapeTool` passes original `updatedInput` (`sdk.test.ts`). Live SDK turns not run on this machine.
- [x] **Done** Start from a new idea (pick a repo, idea required) — e2e; `new-idea-dialog-light.png`
- [x] **Done (demo e2e; unit for remembered repo)** Start from an existing issue; Jira without repo asks for a repo and remembers it — e2e PROJ-150 picker; `setIssueRepo` + upsert without `repoSlug` keeps `repo_slug` (`issues.test.ts`). Real GET `/api/issues` Jira sync not live-run here.
- [x] **Done** Save Jira or GitHub each time — e2e; `save-dialog-light.png` `save-github-light.png`
- [x] **Done** Save can update an existing issue — `shape.test.ts`
- [x] **Done** Nothing created until Save
- [x] **Done** After save, Start is a quiet disabled control with “Coming in Phase 2”; `savedKey` from server survives reload — e2e; `shape-saved-light.png`
- [x] **Done** Issues list + empty state — e2e; `issues-empty-light.png`
- [x] **Done** Error states: missing tracker, failed Jira connect inline — e2e; `settings-jira-error-dark.png`
- [x] **Done** Demo/fake adapters — `FLIGHTDECK_DEMO=1`
- [x] **Done** Real `gh` adapter (no `--json` on `issue create`)
- [x] **Done** Real Jira REST `POST /rest/api/3/search/jql` + ADF
- [x] **Done** Real Agent SDK read-only + AskUserQuestion
- [x] **Done** README Mac run + Playwright Chromium via `pnpm install` / `pnpm check`
