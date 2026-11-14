import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type Engines = { node: string; pnpm: string };

const FALLBACK: Engines = { node: ">=22.13.0", pnpm: ">=12.18.0" };

export function loadEngines(packageJsonPath?: string): Engines {
  const path = packageJsonPath ?? join(dirname(fileURLToPath(import.meta.url)), "../../../../../package.json");
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as { engines?: Partial<Engines> };
    return {
      node: raw.engines?.node || FALLBACK.node,
      pnpm: raw.engines?.pnpm || FALLBACK.pnpm,
    };
  } catch {
    return FALLBACK;
  }
}

export const MIN_GIT = "2.20.0";
