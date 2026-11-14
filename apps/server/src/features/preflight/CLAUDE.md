# preflight

Startup and `GET /api/preflight` dependency checks. Required failures do not crash the server (except an unsupported Node version). Do not put secrets in cache keys or logs. Database schema health lives in `features/db`.
