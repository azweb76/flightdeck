# @flightdeck/shared

Zod schemas and pure helpers used by the server and web app.

- Public API: `src/index.ts` only.
- Canonical test: `src/labels.test.ts` (label parsing).
- Config import tests: `src/schemas/team-config.test.ts`.
- Product constants: `APP_NAME` is `Flightdeck`, slug `flightdeck`, data dir `.flightdeck`, bundle `dev.flightdeck.app`, Keychain `flightdeck`.
- Do not import `apps/*` from here.
