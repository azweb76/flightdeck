import { execSync, spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const apiPort = process.env.FLIGHTDECK_PORT ?? "47421";
const webPort = process.env.FLIGHTDECK_WEB_PORT ?? "47422";
const dataDir = process.env.FLIGHTDECK_DATA_DIR;
if (!dataDir) throw new Error("FLIGHTDECK_DATA_DIR is required");
const apiUrl = `http://127.0.0.1:${apiPort}`;

async function waitFor(fn, timeoutMs, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timed out: ${label}`);
}

async function health() {
  try {
    const res = await fetch(`${apiUrl}/api/health`);
    if (!res.ok) return undefined;
    return await res.json();
  } catch {
    return undefined;
  }
}

function start(filter, extraEnv) {
  return spawn("pnpm", ["--filter", filter, filter.includes("server") ? "start" : "dev"], {
    cwd: root,
    env: extraEnv,
    stdio: "inherit",
  });
}

function insertLiveSurvivors(dir) {
  const db = new DatabaseSync(join(dir, "app.sqlite"));
  db.prepare("INSERT OR REPLACE INTO repos (owner, name, local_path, demo) VALUES (?,?,?,0)").run(
    "dan",
    "app",
    "/Users/dan/src/app",
  );
  db.prepare("INSERT OR REPLACE INTO repo_favorites (owner, name, demo) VALUES (?,?,0)").run("dan", "app");
  const row = db.prepare("SELECT value FROM settings WHERE key = 'app'").get();
  const settings = row ? JSON.parse(row.value) : {};
  settings.theme = "dark";
  db.prepare("INSERT INTO settings (key, value) VALUES ('app', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(
    JSON.stringify(settings),
  );
  db.close();
}

function freePort(port) {
  try {
    execSync(`fuser -k ${port}/tcp`, { stdio: "ignore" });
  } catch {
    /* nothing listening */
  }
  try {
    const pids = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN`, { encoding: "utf8" }).trim();
    if (pids) execSync(`kill -9 ${pids.split(/\s+/).join(" ")}`, { stdio: "ignore" });
  } catch {
    /* nothing listening */
  }
}

const demoEnv = {
  ...process.env,
  FLIGHTDECK_DEMO: "1",
  FLIGHTDECK_DATA_DIR: dataDir,
  FLIGHTDECK_HOST: "127.0.0.1",
  FLIGHTDECK_PORT: apiPort,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN ?? "test-env-github-token",
};

const demo = start("@flightdeck/server", demoEnv);
await waitFor(async () => (await health())?.demo === true, 45_000, "demo health");
await fetch(`${apiUrl}/api/demo/reset`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ seed: true }),
});
await fetch(`${apiUrl}/api/settings`, {
  method: "PATCH",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    jiraSiteUrl: "https://example.atlassian.net",
    jiraEmail: "dan@example.com",
    jiraConfigured: true,
  }),
});
try {
  demo.kill("SIGTERM");
} catch {
  /* already gone */
}
freePort(apiPort);
await waitFor(async () => !(await health()), 30_000, "demo server stop");
insertLiveSurvivors(dataDir);

const liveEnv = { ...process.env };
delete liveEnv.FLIGHTDECK_DEMO;
delete liveEnv.GITHUB_TOKEN;
delete liveEnv.GH_TOKEN;
Object.assign(liveEnv, {
  FLIGHTDECK_DATA_DIR: dataDir,
  FLIGHTDECK_HOST: "127.0.0.1",
  FLIGHTDECK_PORT: apiPort,
  FLIGHTDECK_WEB_PORT: webPort,
  FLIGHTDECK_NO_KEYCHAIN: "1",
});

const api = start("@flightdeck/server", liveEnv);
const web = start("@flightdeck/web", liveEnv);
await waitFor(async () => (await health())?.demo === false, 45_000, "live health");
await waitFor(async () => {
  try {
    return (await fetch(`http://127.0.0.1:${webPort}`)).ok;
  } catch {
    return false;
  }
}, 45_000, "web");

function shutdown() {
  api.kill("SIGTERM");
  web.kill("SIGTERM");
  freePort(apiPort);
  freePort(webPort);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
