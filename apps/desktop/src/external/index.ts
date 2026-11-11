import { ipcMain, shell, type BrowserWindow } from "electron";
import { isAllowedExternalUrl } from "@flightdeck/shared";
import { OPEN_EXTERNAL_CHANNEL } from "./channel.ts";

export { OPEN_EXTERNAL_CHANNEL };

export async function openAllowedExternal(url: string): Promise<boolean> {
  if (!isAllowedExternalUrl(url)) return false;
  await shell.openExternal(url);
  return true;
}

export function registerOpenExternalIpc(): void {
  ipcMain.handle(OPEN_EXTERNAL_CHANNEL, async (_event, url: unknown) => {
    if (typeof url !== "string") return { ok: false };
    return { ok: await openAllowedExternal(url) };
  });
}

/** Never load third-party pages inside the app window. */
export function trapInAppNavigation(win: BrowserWindow, appOrigin: string): void {
  win.webContents.setWindowOpenHandler(({ url }) => {
    void openAllowedExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith(appOrigin)) return;
    event.preventDefault();
    void openAllowedExternal(url);
  });
}
