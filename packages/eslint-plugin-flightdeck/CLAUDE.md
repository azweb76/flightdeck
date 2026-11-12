# eslint-plugin-flightdeck

- `flightdeck/no-cross-package-imports`: only `@flightdeck/shared` may be imported across packages.
- `flightdeck/no-floating-input-label`: do not pass `label=` to MUI TextField/Select/Autocomplete; use FormField.
- File/function size limits live in root `eslint.config.js` (300 / 80).
