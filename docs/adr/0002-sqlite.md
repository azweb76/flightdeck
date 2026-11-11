# ADR 0002: SQLite in ~/.flightdeck

## Decision

App state is a SQLite file at `~/.flightdeck/app.sqlite`, created with numbered migrations. Phase 1 tables: `settings`, `repos`.

## Why

One developer per machine; no hosted database. SQLite is enough for settings, later runs, transcripts, and notifications. `node:sqlite` avoids a native addon in the Electron process (the server is a child Node process).

## Consequences

Override the data dir with `FLIGHTDECK_DATA_DIR` in tests. Do not store the Jira token in SQLite.
