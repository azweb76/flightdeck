import { describe, expect, it, vi } from "vitest";
import { JIRA_API_TOKEN_URL } from "@flightdeck/shared";
import { openExternalUrl } from "./openExternal.ts";

describe("openExternalUrl", () => {
  it("uses the Electron bridge when present", async () => {
    const openExternal = vi.fn(async () => ({ ok: true }));
    const openTab = vi.fn();
    expect(await openExternalUrl(JIRA_API_TOKEN_URL, { openExternal, openTab })).toBe(true);
    expect(openExternal).toHaveBeenCalledWith(JIRA_API_TOKEN_URL);
    expect(openTab).not.toHaveBeenCalled();
  });

  it("opens a new tab when there is no Electron bridge", async () => {
    const openTab = vi.fn();
    expect(await openExternalUrl(JIRA_API_TOKEN_URL, { openTab })).toBe(true);
    expect(openTab).toHaveBeenCalledWith(JIRA_API_TOKEN_URL);
  });

  it("does not open disallowed URLs", async () => {
    const openExternal = vi.fn(async () => ({ ok: true }));
    const openTab = vi.fn();
    expect(await openExternalUrl("https://evil.example", { openExternal, openTab })).toBe(false);
    expect(openExternal).not.toHaveBeenCalled();
    expect(openTab).not.toHaveBeenCalled();
  });
});
