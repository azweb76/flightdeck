import { existsSync } from "node:fs";
import { join } from "node:path";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "@hono/node-server/serve-static";
import { formatError } from "./errors.ts";
import { apiTiming } from "./timing.ts";
import { eventRoutes } from "./routes/events.ts";
import { goalRoutes } from "./routes/goals.ts";
import { issueRoutes } from "./routes/issues.ts";
import { notificationRoutes } from "./routes/notifications.ts";
import { repoRoutes } from "./routes/repos.ts";
import { reviewRoutes } from "./routes/reviews.ts";
import { runRoutes } from "./routes/runs.ts";
import { settingsRoutes } from "./routes/settings.ts";
import { setupRoutes } from "./routes/setup.ts";
import { statsRoutes } from "./routes/stats.ts";
import { prRoutes } from "./routes/prs.ts";
import { nextRoutes } from "./routes/next.ts";
import { activeRunCount } from "../features/runs/index.ts";

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
  app.use("/api/*", apiTiming());
  app.onError((err, c) => {
    const { status, body } = formatError(err);
    return c.json(body, status as never);
  });

  app.get("/api/health", (c) => c.json({ ok: true }));
  app.get("/api/runner", (c) => c.json({ active: activeRunCount() }));
  app.route("/api/setup", setupRoutes());
  app.route("/api/settings", settingsRoutes());
  app.route("/api/repos", repoRoutes());
  app.route("/api/issues", goalRoutes());
  app.route("/api/issues", issueRoutes());
  app.route("/api/runs", runRoutes());
  app.route("/api/events", eventRoutes());
  app.route("/api/notifications", notificationRoutes());
  app.route("/api/reviews", reviewRoutes());
  app.route("/api/prs", prRoutes());
  app.route("/api/next", nextRoutes());
  app.route("/api/stats", statsRoutes());

  const webDist = process.env.FLIGHTDECK_WEB_DIST;
  if (webDist && existsSync(webDist)) {
    app.use("/*", serveStatic({ root: webDist }));
    app.get("/*", serveStatic({ path: join(webDist, "index.html") }));
  }
  return app;
}
