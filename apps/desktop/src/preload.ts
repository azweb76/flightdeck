import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("flightdeck", {
  platform: process.platform,
});
