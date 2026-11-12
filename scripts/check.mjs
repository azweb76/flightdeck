#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const workspacePkgs = [
  { name: "@flightdeck/shared", dir: "packages/shared" },
  { name: "eslint-plugin-flightdeck", dir: "packages/eslint-plugin-flightdeck" },
  { name: "@flightdeck/server", dir: "apps/server" },
  { name: "@flightdeck/web", dir: "apps/web" },
  { name: "@flightdeck/e2e", dir: "apps/e2e" },
];

function run(label, command, cwd) {
  const r = spawnSync(command[0], command.slice(1), {
    cwd,
    encoding: "utf8",
    env: { ...process.env, FORCE_COLOR: "0" },
  });
  if (r.status === 0) return true;
  console.error(`\nFAIL ${label}`);
  if (r.stdout) process.stderr.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return false;
}

const rootLint = run("lint (repo)", ["pnpm", "exec", "eslint", ".", "--max-warnings", "0"], process.cwd());
const browsers = run(
  "playwright chromium",
  ["pnpm", "exec", "playwright", "install", "chromium"],
  resolve("apps/e2e"),
);
let ok = rootLint && browsers;
for (const p of workspacePkgs) {
  if (!existsSync(resolve(p.dir, "package.json"))) continue;
  const scripts = JSON.parse(readFileSync(resolve(p.dir, "package.json"), "utf8")).scripts ?? {};
  if (scripts.typecheck) ok = run(`${p.name} typecheck`, ["pnpm", "run", "typecheck"], p.dir) && ok;
  if (scripts.test) ok = run(`${p.name} test`, ["pnpm", "run", "test"], p.dir) && ok;
  if (scripts.build) ok = run(`${p.name} build`, ["pnpm", "run", "build"], p.dir) && ok;
}
if (!ok) process.exit(1);
