#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const prompt = process.argv.slice(2).join(" ");
if (/username/i.test(prompt)) {
  process.stdout.write("x-access-token");
  process.exit(0);
}

let token = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "").trim();
try {
  if (!token) {
    const { Entry } = await import("@napi-rs/keyring");
    token = new Entry("flightdeck", "github-token").getPassword() ?? "";
  }
} catch {
  token = token || "";
}
if (!token.trim()) {
  const dir = process.env.FLIGHTDECK_DATA_DIR || join(homedir(), ".flightdeck");
  const path = join(dir, "secrets", "github-token");
  if (existsSync(path)) token = readFileSync(path, "utf8");
}
token = token.trim();
if (!token) process.exit(1);
process.stdout.write(token);
