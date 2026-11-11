import { afterEach, describe, expect, it } from "vitest";
import { createSecretStore } from "./index.ts";

const original = process.platform;

afterEach(() => {
  Object.defineProperty(process, "platform", { value: original });
});

describe("secret store", () => {
  it("uses Keychain service flightdeck on macOS", async () => {
    Object.defineProperty(process, "platform", { value: "darwin" });
    const calls: string[][] = [];
    const store = createSecretStore(async (file, args) => {
      calls.push([file, ...args]);
      return { code: 0, stdout: "tok\n", stderr: "" };
    });
    await store.get();
    expect(calls[0]).toEqual([
      "security",
      "find-generic-password",
      "-s",
      "flightdeck",
      "-a",
      "jira-api-token",
      "-w",
    ]);
  });
});
