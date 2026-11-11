#!/usr/bin/env node
/**
 * pnpm check — typecheck, lint, tests. Prints only failures.
 * Usage:
 *   pnpm check
 *   pnpm check -- --filter @flightdeck/shared
 *   pnpm check -- --changed
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const filterArg = takeFlag("--filter");
const changed = args.includes("--changed");

const workspacePkgs = [
  { name: "@flightdeck/shared", dir: "packages/shared" },
  { name: "eslint-plugin-flightdeck", dir: "packages/eslint-plugin-flightdeck" },
  { name: "@flightdeck/server", dir: "apps/server" },
  { name: "@flightdeck/web", dir: "apps/web" },
  { name: "@flightdeck/desktop", dir: "apps/desktop" },
];

function takeFlag(flag) {
  const i = args.indexOf(flag);
  if (i === -1) return undefined;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
}

function changedDirs() {
  const r = spawnSync("git", ["diff", "--name-only", "HEAD", "origin/main"], {
    encoding: "utf8",
  });
  const fallback = spawnSync("git", ["diff", "--name-only", "HEAD"], { encoding: "utf8" });
  const files = `${r.stdout ?? ""}\n${fallback.stdout ?? ""}`.split("\n").filter(Boolean);
  const staged = spawnSync("git", ["diff", "--name-only", "--cached"], { encoding: "utf8" });
  files.push(...(staged.stdout ?? "").split("\n").filter(Boolean));
  return workspacePkgs.filter((p) => files.some((f) => f.startsWith(`${p.dir}/`)));
}

function selected() {
  if (filterArg) {
    return workspacePkgs.filter((p) => p.name === filterArg || p.dir === filterArg);
  }
  if (changed) {
    const d = changedDirs();
    return d.length ? d : workspacePkgs;
  }
  return workspacePkgs.filter((p) => existsSync(resolve(p.dir, "package.json")));
}

function pkgScripts(dir) {
  const pkg = JSON.parse(readFileSync(resolve(dir, "package.json"), "utf8"));
  return pkg.scripts ?? {};
}

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

let ok = rootLint;
for (const p of selected()) {
  const scripts = pkgScripts(p.dir);
  if (scripts.typecheck) {
    ok = run(`${p.name} typecheck`, ["pnpm", "run", "typecheck"], p.dir) && ok;
  }
  if (scripts.test) {
    ok = run(`${p.name} test`, ["pnpm", "run", "test"], p.dir) && ok;
  }
}

if (!ok) process.exit(1);
