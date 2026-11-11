import { replaceCatalog, setFavorite, touchRecent } from "../catalog/index.ts";
import { createRepo, getRepoBySlug } from "../repos/index.ts";

const ORGS = ["acme", "globex", "initech"] as const;
const NAMES = [
  "web",
  "api",
  "docs",
  "mobile",
  "infra",
  "design",
  "billing",
  "auth",
  "search",
  "ml",
  "ios",
  "android",
  "platform",
  "cli",
] as const;

const READ_ONLY = new Set(["initech/docs", "initech/design", "globex/design"]);
const PRIVATE = new Set(["acme/billing", "globex/ml", "initech/auth"]);

export function seedCatalog(): void {
  const rows = ORGS.flatMap((owner) =>
    NAMES.map((name, i) => {
      const slug = `${owner}/${name}`;
      return {
        owner,
        name,
        description: `${owner} ${name} service`,
        private: PRIVATE.has(slug),
        defaultBranch: "main",
        pushedAt: `2026-11-${String((i % 28) + 1).padStart(2, "0")}T00:00:00Z`,
        permission: READ_ONLY.has(slug) ? ("READ" as const) : ("WRITE" as const),
      };
    }),
  );
  replaceCatalog(rows);
  for (const slug of ["acme/web", "acme/api", "globex/platform"]) {
    const [owner, name] = slug.split("/") as [string, string];
    setFavorite(owner, name, true);
    ensureLocal(owner, name);
  }
  const recent = [
    "acme/docs",
    "acme/web",
    "globex/api",
    "initech/cli",
    "acme/mobile",
    "globex/web",
    "initech/platform",
    "acme/auth",
    "globex/infra",
    "initech/search",
    "acme/billing",
  ];
  for (const slug of recent) {
    const [owner, name] = slug.split("/") as [string, string];
    touchRecent(owner, name);
    ensureLocal(owner, name);
  }
  ensureLocal("acme", "docs");
}

function ensureLocal(owner: string, name: string): void {
  if (!getRepoBySlug(`${owner}/${name}`)) createRepo({ owner, name, defaultBranch: "main" });
}
