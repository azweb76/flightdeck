import { serve } from "@hono/node-server";
import { DEFAULT_HOST, DEFAULT_PORT } from "@flightdeck/shared";
import { getDb } from "./features/db/index.ts";
import { seedDemo } from "./features/demo/seed.ts";
import { cleanupMerged } from "./features/cleanup/index.ts";
import { createApp } from "./http/app.ts";

const host = process.env.FLIGHTDECK_HOST ?? DEFAULT_HOST;
const port = Number(process.env.FLIGHTDECK_PORT ?? DEFAULT_PORT);

getDb();
await seedDemo();
const app = createApp();

serve({ fetch: app.fetch, hostname: host, port }, (info) => {
  console.info(`Flightdeck server on http://${info.address}:${info.port}`);
});

setInterval(() => {
  void cleanupMerged();
}, 60_000);
