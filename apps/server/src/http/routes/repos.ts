import { Hono, type Context } from "hono";
import { z } from "zod";
import { publish } from "../../features/events/index.ts";
import { readCatalog, refreshCatalog, scheduleCatalogRefresh, setFavorite } from "../../features/catalog/index.ts";

const FavoriteSchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
  favorite: z.boolean(),
});

export function repoRoutes(): Hono {
  const app = new Hono();
  app.get("/", (c) => {
    const refresh = c.req.query("refresh") === "1" || c.req.query("refresh") === "true";
    if (refresh) return refreshThenJson(c);
    const snapshot = readCatalog();
    if (snapshot.stale) scheduleCatalogRefresh();
    return c.json(snapshot);
  });
  app.post("/refresh", (c) => refreshThenJson(c));
  app.post("/favorite", async (c) => {
    const body = FavoriteSchema.parse(await c.req.json());
    setFavorite(body.owner, body.name, body.favorite);
    publish("repos.updated");
    return c.json(readCatalog());
  });
  return app;
}

async function refreshThenJson(c: Context) {
  await refreshCatalog();
  publish("repos.updated");
  return c.json(readCatalog());
}
