import { Hono } from "hono";
import { join } from "node:path";
import { homedir } from "node:os";
import { CreateRepoSchema, PatchRepoSchema } from "@flightdeck/shared";
import { publish } from "../../features/events/index.ts";
import { createGithubClient } from "../../features/github/index.ts";
import { createRepo, deleteRepo, getRepo, listRepos, patchRepo } from "../../features/repos/index.ts";
import { getSettings } from "../../features/settings/index.ts";
import { dataDir } from "../../paths.ts";
import { apiError } from "../errors.ts";

export function repoRoutes(): Hono {
  const app = new Hono();
  app.get("/", (c) => c.json({ repos: listRepos() }));

  app.post("/", async (c) => {
    const input = CreateRepoSchema.parse(await c.req.json());
    try {
      let repo = createRepo(input);
      if (input.clone) {
        const dest = repo.localPath || defaultClonePath(repo.owner, repo.name);
        const cloned = await createGithubClient().cloneRepo(repo.owner, repo.name, dest);
        if (!cloned.ok) throw apiError(400, "clone_failed", cloned.detail);
        repo = patchRepo(repo.id, { localPath: dest }) ?? repo;
      }
      publish("repos.updated");
      return c.json(repo, 201);
    } catch (err) {
      if (String(err).includes("UNIQUE")) {
        throw apiError(409, "duplicate", "That repo is already registered");
      }
      throw err;
    }
  });

  app.patch("/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const patch = PatchRepoSchema.parse(await c.req.json());
    const repo = patchRepo(id, patch);
    if (!repo) throw apiError(404, "not_found", "Repo not found");
    publish("repos.updated");
    return c.json(repo);
  });

  app.delete("/:id", (c) => {
    const id = Number(c.req.param("id"));
    if (!deleteRepo(id)) throw apiError(404, "not_found", "Repo not found");
    publish("repos.updated");
    return c.json({ ok: true });
  });

  app.post("/:id/clone", async (c) => {
    const repo = getRepo(Number(c.req.param("id")));
    if (!repo) throw apiError(404, "not_found", "Repo not found");
    const dest = repo.localPath || defaultClonePath(repo.owner, repo.name);
    const cloned = await createGithubClient().cloneRepo(repo.owner, repo.name, dest);
    if (!cloned.ok) throw apiError(400, "clone_failed", cloned.detail);
    const next = patchRepo(repo.id, { localPath: dest });
    publish("repos.updated");
    return c.json(next);
  });

  return app;
}

function defaultClonePath(owner: string, name: string): string {
  const settings = getSettings();
  const root = settings.workspaceFolder || join(dataDir(), "repos");
  const expanded = root.startsWith("~/") ? join(homedir(), root.slice(2)) : root;
  return join(expanded, owner, name);
}
