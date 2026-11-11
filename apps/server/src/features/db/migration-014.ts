export const MIGRATION_014 = {
  id: "014_parallel_spend",
  sql: `
    CREATE TABLE IF NOT EXISTS daily_spend (
      day TEXT PRIMARY KEY,
      usd REAL NOT NULL DEFAULT 0
    );
  `,
};
