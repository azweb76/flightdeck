import { Hono } from "hono";
import { cors } from "hono/cors";
import { onError } from "./errors.ts";
import { mountMeta } from "./routes/meta.ts";
import { mountSettings } from "./routes/settings.ts";
import { mountIssues } from "./routes/issues.ts";
import { mountShape } from "./routes/shape.ts";
import { mountSse } from "./sse.ts";

export function createApp(): Hono {
  const app = new Hono();
  app.use("*", cors({ origin: ["http://127.0.0.1:47322", "http://localhost:47322"], credentials: true }));
  app.onError(onError);
  mountMeta(app);
  mountSettings(app);
  mountIssues(app);
  mountShape(app);
  mountSse(app);
  return app;
}
