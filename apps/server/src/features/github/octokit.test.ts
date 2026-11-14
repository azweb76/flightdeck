import { describe, expect, it } from "vitest";
import { RATE_LIMIT } from "../cache/index.ts";
import { setSleepForTests } from "../cache/retry.ts";
import { resetCacheForTests } from "../cache/store.ts";
import { createGithubClient } from "./index.ts";

describe("octokit rate-limit ownership", () => {
  it("keeps throttle enabled, caps waits at 30s, then returns the friendly error", async () => {
    resetCacheForTests();
    const sleeps: number[] = [];
    setSleepForTests(async (ms) => {
      sleeps.push(ms);
    });
    const reset = String(Math.floor(Date.now() / 1000) + 3600);
    const gh = createGithubClient({
      token: "t",
      fetch: (async (input, _init) => {
        const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
        if (url.pathname === "/search/issues") {
          return new Response(JSON.stringify({ message: "API rate limit exceeded" }), {
            status: 403,
            headers: {
              "content-type": "application/json",
              "x-ratelimit-remaining": "0",
              "x-ratelimit-reset": reset,
            },
          });
        }
        return new Response("{}", { status: 500, headers: { "content-type": "application/json" } });
      }) as typeof fetch,
    });
    const started = Date.now();
    await expect(gh.listAssignedIssues()).rejects.toThrow(/GitHub is rate limiting, retrying in \d+s/);
    expect(Date.now() - started).toBeLessThan(2_000);
    expect(sleeps.length).toBe(RATE_LIMIT.maxAttempts - 1);
    expect(sleeps.every((ms) => ms <= RATE_LIMIT.capMs)).toBe(true);
    expect(sleeps.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(RATE_LIMIT.capMs * (RATE_LIMIT.maxAttempts - 1));
    setSleepForTests();
  });
});
