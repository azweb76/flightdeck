import { Hono } from "hono";
import { cors } from "hono/cors";
import { onError } from "./errors.ts";
import { mountMeta } from "./routes/meta.ts";
import { mountPreflight } from "./routes/preflight.ts";
import { mountGithub } from "./routes/github.ts";
import { mountSettings } from "./routes/settings.ts";
import { mountIssues } from "./routes/issues.ts";
import { mountShape } from "./routes/shape.ts";
import { mountSse } from "./sse.ts";

export function createApp(): Hono {
  const app = new Hono();
  app.use("*", cors({ origin: ["http://127.0.0.1:47322", "http://localhost:47322"], credentials: true }));
  app.onError(onError);
  mountMeta(app);
  mountPreflight(app);
  mountSettings(app);
  mountGithub(app);
  mountIssues(app);
  mountShape(app);
  mountSse(app);
  return app;
}
