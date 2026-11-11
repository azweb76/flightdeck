# ADR 0004: Jira token in the macOS Keychain

## Decision

Jira Cloud email + API token. The token is stored in the macOS Keychain under service `flightdeck`, account `jira-api-token`. On Linux (dev only) it falls back to `~/.flightdeck/secrets/jira-api-token` with mode `0600` in a `0700` directory.

## Why

The token must not live in SQLite or git. Keychain is the native secret store on the shipping platform. The file fallback exists so the server can be developed on Linux.

## Consequences

macOS Keychain was not verified in Linux CI/VMs. Callers go through `createSecretStore()` only.
