# ADR 0005: One GitHub repo per Jira issue via labels

## Decision

Jira issues map to GitHub repos through labels. Default format `gh:owner/repo`; the prefix is configurable. GitHub issues need no label (they already belong to a repo). Zero labels or several labels is a warning in Phase 1; later, several labels can split into sub-issues.

## Why

No syncing between Jira and GitHub. A label is visible in Jira and easy to share in a team config file.

## Consequences

Unknown `gh:owner/repo` labels that are not registered still show as linked but unregistered. Refine/Start (later phases) stay disabled without exactly one registered repo.
