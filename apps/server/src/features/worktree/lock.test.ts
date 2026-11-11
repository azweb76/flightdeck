import { describe, expect, it } from "vitest";
import { withRepoLock } from "./lock.ts";

describe("withRepoLock", () => {
  it("runs the same repo serially and different repos together", async () => {
    const log: string[] = [];
    const a = withRepoLock("acme/web", async () => {
      log.push("a-start");
      await new Promise((r) => setTimeout(r, 30));
      log.push("a-end");
    });
    const b = withRepoLock("acme/web", async () => {
      log.push("b-start");
      log.push("b-end");
    });
    const c = withRepoLock("acme/api", async () => {
      log.push("c");
    });
    await Promise.all([a, b, c]);
    expect(log.indexOf("a-end")).toBeLessThan(log.indexOf("b-start"));
    expect(log).toContain("c");
  });
});
