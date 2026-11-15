import type { CatalogRepo } from "@flightdeck/shared";

const names = [
  "web",
  "api",
  "mobile",
  ...Array.from({ length: 37 }, (_, i) => `repo-${String(i + 4).padStart(2, "0")}`),
];

export const DEMO_REPOS: CatalogRepo[] = names.map((name) => ({ owner: "acme", name, localPath: "" }));
