# eslint-plugin-flightdeck

Custom ESLint rules for this repo.

- `flightdeck/no-cross-package-imports`: apps cannot import each other. Only `@flightdeck/shared` is shareable.
- File/function size limits live in the root `eslint.config.js` (`max-lines` 300, `max-lines-per-function` 80).
