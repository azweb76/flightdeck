# ADR 0007: Claude Agent SDK Auto permission mode

## Decision

Flightdeck uses the Claude Agent SDK `permissionMode: "auto"` (Claude Code Auto). The SDK documents `auto` as a first-class `PermissionMode`. A `canUseTool` allowlist still **denies** high-risk Bash (sudo, `rm -rf /`, curl|sh, mkfs, dd, shutdown).

## Why

Dan asked to reuse Auto if the SDK supports it. It does, as of the TypeScript SDK reference.

## Consequences

Real SDK sessions are unverified on this Linux VM (no Anthropic network run). Tests and `FLIGHTDECK_DEMO=1` use `createFakeDriver()`. Set `FLIGHTDECK_AGENT=sdk` to force the real driver.
