# @flightdeck/web

React + MUI. Form inputs go through `FormField` (static label above the field). Do not pass `label=` to MUI TextField/Select. Do not import `apps/server`.

Structure: `src/features/<name>/` per area (issues, refine, runs, prs, settings, chat, markdown, repos), each with an `index.ts` that exports what other code may import. Routes in `App.tsx` import only from feature `index.ts`. Shared primitives live in `src/ui`. No `pages/` folder.
