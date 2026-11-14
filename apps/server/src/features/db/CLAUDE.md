# db

SQLite at `~/.flightdeck/app.sqlite` (`FLIGHTDECK_DATA_DIR`). Schema version is `PRAGMA user_version` (`SCHEMA_VERSION` in `schema.ts`). Startup creates missing tables, then `ALTER TABLE` for missing columns (`PRAGMA table_info`). v1 databases (`schema_migrations` / `runs` / `issues.repos_json`) are renamed to `*.v1-backup-<timestamp>` and replaced; never deleted.
