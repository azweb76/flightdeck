# ADR 0003: GitHub auth via the gh CLI

## Decision

Flightdeck never asks for a GitHub PAT. It shells out to `gh` (`gh auth status`, issues, clone, later PRs).

## Why

Developers already log in with `gh`. Reusing that login avoids a second credential and matches how PRs will be opened.

## Consequences

`gh` must be installed and logged in. The setup wizard checks this and points at `gh auth login`.
