import { contextBridge, ipcRenderer } from "electron";
import { OPEN_EXTERNAL_CHANNEL } from "./external/channel.ts";

contextBridge.exposeInMainWorld("flightdeck", {
  platform: process.platform,
  openExternal: (url: string) => ipcRenderer.invoke(OPEN_EXTERNAL_CHANNEL, url) as Promise<{ ok: boolean }>,
});
