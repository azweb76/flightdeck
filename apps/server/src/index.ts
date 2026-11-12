import { serve } from "@hono/node-server";
import { DEFAULT_HOST, DEFAULT_PORT } from "@flightdeck/shared";
import { seedDemo, shouldSeed } from "./features/demo/index.ts";
import { createApp } from "./http/app.ts";

if (shouldSeed()) seedDemo();

const port = Number(process.env.FLIGHTDECK_PORT ?? DEFAULT_PORT);
const hostname = process.env.FLIGHTDECK_HOST ?? DEFAULT_HOST;
const app = createApp();

serve({ fetch: app.fetch, hostname, port }, (info) => {
  console.info(`Flightdeck API http://${info.address}:${info.port}`);
});
