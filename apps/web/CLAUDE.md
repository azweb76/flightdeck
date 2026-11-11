# @flightdeck/web

React UI (MUI v9 + Emotion). Talks to the local server over `/api`. Never import `apps/server`.

- Theme: `src/features/theme/` (`CssVarsProvider`, macOS light/dark via `prefers-color-scheme` / system mode). Use `sx` only; Grid `size`; Stack.
- Canonical component: `src/features/issues/IssueCard.tsx` (PR Open cards nest `BoardPr` rows)
- Board PR settings: `src/features/settings/BoardSettings.tsx`
- Shell: `src/features/shell/AppShell.tsx`
- Markdown editor: `src/ui/components/markdown/` (preview-first, no third-party editor)
- Wizard: `src/features/wizard/`
- Jira token field: `src/features/jira/JiraTokenHint.tsx` opens `JIRA_API_TOKEN_URL` via `openExternal` (Electron allowlist / new tab)
- Feature folders expose `index.ts`.
- Run view: `src/features/runs/RunView.tsx`
- Goal editor: `src/features/issues/GoalEditor.tsx`
- Review diff: `src/features/reviews/ReviewDiff.tsx`
- Stats / inbox: `src/features/stats/`
