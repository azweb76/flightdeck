# eslint-plugin-flightdeck

Custom ESLint rules for this repo.

- `flightdeck/no-cross-package-imports`: apps cannot import each other. Only `@flightdeck/shared` is shareable.
- `flightdeck/no-floating-input-label`: do not pass `label=` to MUI `TextField` / `Select` / `Autocomplete`. Use `FormField` (static label above a compact outlined box).
- File/function size limits live in the root `eslint.config.js` (`max-lines` 300, `max-lines-per-function` 80).
