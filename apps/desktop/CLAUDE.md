# @flightdeck/desktop

Electron main + preload. macOS is the product target.

- Starts `@flightdeck/server` as a child process bound to 127.0.0.1.
- Loads the React UI from the Vite dev URL (`FLIGHTDECK_UI_URL`) or the server.
- Product name `Flightdeck`, bundle id `dev.flightdeck.app`.
- Do not put business logic here; it belongs on the server.
