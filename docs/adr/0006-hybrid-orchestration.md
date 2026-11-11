# ADR 0006: Hybrid orchestration (planned)

## Decision

Later phases: the app owns the loop (plan → implement → review for N rounds). Each phase is its own Claude Agent SDK session and may spawn SDK subagents. Typed JSON handoffs are stored in SQLite and rendered to markdown for the next phase.

## Why

A fully agent-owned loop is hard to pause, cap, and resume. App-controlled phases give a fixed round count, a dollar cap, and a place to store transcripts.

## Consequences

Phase 1 only detects Claude Code config (`apiKeyHelper`, `ANTHROPIC_BASE_URL`). No agent runs yet. Prompts/models imported from team config are stored deferred for later.
