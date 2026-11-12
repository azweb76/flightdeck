import type { CatalogRepo } from "@flightdeck/shared";
import { listRememberedRepos } from "../clone/index.ts";
import { createGithubClient } from "../github/index.ts";

const DEMO: CatalogRepo[] = [
  { owner: "acme", name: "web", localPath: "" },
  { owner: "acme", name: "api", localPath: "" },
];

export async function listCatalog(): Promise<CatalogRepo[]> {
  const remembered = listRememberedRepos();
  const remote = process.env.FLIGHTDECK_DEMO === "1" ? DEMO : await remoteRepos();
  const byKey = new Map<string, CatalogRepo>();
  for (const r of [...remote, ...remembered]) {
    byKey.set(`${r.owner}/${r.name}`, {
      owner: r.owner,
      name: r.name,
      localPath: r.localPath || byKey.get(`${r.owner}/${r.name}`)?.localPath || "",
    });
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function remoteRepos(): Promise<CatalogRepo[]> {
  try {
    return await createGithubClient().listRepos();
  } catch {
    return [];
  }
}
