# ADR 0008: Draft PRs and two review rounds

## Decision

- `gh pr create --draft` by default (`settings.prDraft`, default true).
- App-controlled plan → implement → review for `settings.reviewRounds` (default **2**).
- Per-run dollar cap default **$10**; max concurrency default **2**.

## Why

Open questions from the design: drafts are safer for agent PRs; a fixed round count prevents infinite review loops.

## Consequences

Settings can change all three. Settings-kind improvements always need Dan's approval (Phase 7).
