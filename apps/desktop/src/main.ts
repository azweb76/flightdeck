import { app, BrowserWindow } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { APP_BUNDLE_ID, APP_NAME, DEFAULT_PORT } from "@flightdeck/shared";

const here = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.FLIGHTDECK_PORT ?? DEFAULT_PORT);
const uiUrl = process.env.FLIGHTDECK_UI_URL ?? `http://127.0.0.1:${port}`;

let server: ChildProcess | undefined;

function startServer(): void {
  if (process.env.FLIGHTDECK_UI_URL) return;
  const repoRoot = join(here, "..", "..", "..");
  server = spawn("pnpm", ["--filter", "@flightdeck/server", "start"], {
    cwd: repoRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      FLIGHTDECK_HOST: "127.0.0.1",
      FLIGHTDECK_PORT: String(port),
    },
  });
}

app.setName(APP_NAME);
app.setAppUserModelId(APP_BUNDLE_ID);
if (process.platform === "darwin") {
  app.setAboutPanelOptions({ applicationName: APP_NAME });
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: APP_NAME,
    webPreferences: {
      preload: join(here, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  void win.loadURL(uiUrl);
}

app.whenReady().then(() => {
  startServer();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  server?.kill();
});
