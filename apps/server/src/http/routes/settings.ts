import { Hono } from "hono";
import { SettingsPatchSchema } from "@flightdeck/shared";
import { publish } from "../../features/events/index.ts";
import { getSettings, patchSettings } from "../../features/settings/index.ts";

export function settingsRoutes(): Hono {
  const app = new Hono();
  app.get("/", (c) => c.json(getSettings()));
  app.put("/", async (c) => {
    const patch = SettingsPatchSchema.parse(await c.req.json());
    const next = patchSettings(patch);
    publish("settings.updated");
    return c.json(next);
  });
  return app;
}
