# ADR 0006: Hybrid orchestration

## Decision

Start runs an app-owned loop: plan → implement → review for N rounds. Each phase is its own Claude Agent SDK session (and may spawn SDK subagents). Handoffs are Zod-validated JSON in SQLite, also written to `.flightdeck/<phase>-r<n>.md` in the worktree for the next phase to read.

If no approved goal exists, Phase 2 behavior remains: a single implementer session, then PR.

## Why

The app can pause, cap, resume, and store a full transcript plus per-phase tokens/cost.

## Consequences

Prompts and models are per role, with per-repo `modelOverride`. Agents reuse Claude Code `settingSources: ["user","project"]` (skills, subagents, MCP) when the real SDK driver runs.
