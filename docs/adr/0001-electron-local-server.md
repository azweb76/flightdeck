# ADR 0001: Electron shell around a local Node server

## Decision

Flightdeck is a macOS Electron app that starts a Node HTTP server bound to `127.0.0.1` and loads a React UI. The same server runs standalone via `pnpm dev` for browser development.

## Why

The product needs a long-lived local runner (later: background agent runs). Putting orchestration on a localhost server keeps Electron thin, lets the UI be ordinary React, and matches later Homebrew-cask distribution.

## Consequences

Business logic lives in `@flightdeck/server`. Electron only spawns the process and opens a window. The API is never advertised off loopback.
