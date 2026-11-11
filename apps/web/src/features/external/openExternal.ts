import { isAllowedExternalUrl } from "@flightdeck/shared";

export type FlightdeckBridge = {
  platform: string;
  openExternal?: (url: string) => Promise<{ ok: boolean }>;
};

declare global {
  interface Window {
    flightdeck?: FlightdeckBridge;
  }
}

export type ExternalHost = {
  openExternal?: (url: string) => Promise<{ ok: boolean }>;
  openTab: (url: string) => void;
};

export function browserExternalHost(): ExternalHost {
  return {
    openExternal: window.flightdeck?.openExternal,
    openTab: (url) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
  };
}

/** Electron: allowlisted `shell.openExternal`. Browser: a new tab. Never in-app. */
export async function openExternalUrl(url: string, host: ExternalHost): Promise<boolean> {
  if (!isAllowedExternalUrl(url)) return false;
  if (host.openExternal) {
    const result = await host.openExternal(url);
    return result.ok;
  }
  host.openTab(url);
  return true;
}

export async function openExternal(url: string): Promise<boolean> {
  return openExternalUrl(url, browserExternalHost());
}
