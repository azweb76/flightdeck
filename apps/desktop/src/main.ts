import { app, BrowserWindow } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { APP_BUNDLE_ID, APP_NAME, DEFAULT_PORT, dockBadgeCount } from "@flightdeck/shared";
import { registerOpenExternalIpc, trapInAppNavigation } from "./external/index.ts";
import { ensureServer, runnerBusy } from "./runner.ts";
import type { ChildProcess } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.FLIGHTDECK_PORT ?? DEFAULT_PORT);
const uiUrl = process.env.FLIGHTDECK_UI_URL ?? `http://127.0.0.1:${port}`;
let server: ChildProcess | undefined;

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
  trapInAppNavigation(win, uiUrl);
  void win.loadURL(uiUrl);
}

app.whenReady().then(async () => {
  registerOpenExternalIpc();
  server = await ensureServer(port, join(here, "..", "..", ".."));
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  setInterval(() => {
    void maybeQuit();
    void refreshDockBadge(port);
  }, 15_000);
  void refreshDockBadge(port);
});

app.on("window-all-closed", () => {
  void maybeQuit(true);
});

app.on("before-quit", () => {
  if (process.platform === "darwin") return;
  server?.kill();
});

async function refreshDockBadge(apiPort: number): Promise<void> {
  if (process.platform !== "darwin") return;
  try {
    const res = await fetch(`http://127.0.0.1:${apiPort}/api/next/badge`);
    const body = (await res.json()) as { badge?: number };
    const count = dockBadgeCount(body.badge, process.platform);
    if (count !== undefined) app.setBadgeCount(count);
  } catch {
    /* server still booting */
  }
}

async function maybeQuit(fromClose = false): Promise<void> {
  const busy = await runnerBusy(port);
  if (busy) return;
  if (BrowserWindow.getAllWindows().length > 0 && !fromClose) return;
  server?.kill();
  if (fromClose || process.platform !== "darwin") app.quit();
  if (fromClose && process.platform === "darwin") app.quit();
}
