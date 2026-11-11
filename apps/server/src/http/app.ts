import { existsSync } from "node:fs";
import { join } from "node:path";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "@hono/node-server/serve-static";
import { formatError } from "./errors.ts";
import { eventRoutes } from "./routes/events.ts";
import { issueRoutes } from "./routes/issues.ts";
import { repoRoutes } from "./routes/repos.ts";
import { settingsRoutes } from "./routes/settings.ts";
import { setupRoutes } from "./routes/setup.ts";

export function createApp(): Hono {
  const app = new Hono();
  app.use(
    "*",
    cors({
      origin: (origin) => origin || "*",
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    }),
  );
  app.onError((err, c) => {
    const { status, body } = formatError(err);
    return c.json(body, status as never);
  });

  app.get("/api/health", (c) => c.json({ ok: true }));
  app.route("/api/setup", setupRoutes());
  app.route("/api/settings", settingsRoutes());
  app.route("/api/repos", repoRoutes());
  app.route("/api/issues", issueRoutes());
  app.route("/api/events", eventRoutes());

  const webDist = process.env.FLIGHTDECK_WEB_DIST;
  if (webDist && existsSync(webDist)) {
    app.use("/*", serveStatic({ root: webDist }));
    app.get("/*", serveStatic({ path: join(webDist, "index.html") }));
  }
  return app;
}
