# @flightdeck/evals

Prompt eval harness. Canonical: `src/harness.ts`. Session reviews insert SQLite `eval_cases`; apply replays them via `@flightdeck/shared` `replayEvalCases` (server must not import this package).
