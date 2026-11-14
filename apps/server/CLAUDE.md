# @flightdeck/server

Localhost HTTP API on 127.0.0.1 plus SSE. Feature folders expose `index.ts`. SQLite under `~/.flightdeck/`. Agent SDK is read-only during shaping. Do not import `apps/web`. Shared TTL cache is `features/cache`; `GET /api/issues` must not sync trackers on every request.
