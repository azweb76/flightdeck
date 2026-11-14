import { describe, expect, it } from "vitest";
import { createTtlCache } from "./store.ts";
import { parseRetryAfterMs, RateLimitError, setSleepForTests, withBackoff } from "./retry.ts";

describe("ttl cache", () => {
  it("returns cached value until TTL expires", async () => {
    let now = 0;
    const cache = createTtlCache({ now: () => now });
    let n = 0;
    const load = async () => ++n;
    expect(await cache.get("k", load, 100)).toBe(1);
    now = 99;
    expect(await cache.get("k", load, 100)).toBe(1);
    now = 101;
    expect(await cache.get("k", load, 100)).toBe(2);
  });

  it("shares one in-flight load across concurrent callers", async () => {
    const cache = createTtlCache();
    let started = 0;
    const load = () =>
      new Promise<string>((resolve) => {
        started += 1;
        setTimeout(() => resolve("ok"), 20);
      });
    const [a, b] = await Promise.all([cache.get("k", load, 1_000), cache.get("k", load, 1_000)]);
    expect(a).toBe("ok");
    expect(b).toBe("ok");
    expect(started).toBe(1);
  });

  it("does not cache failed loads", async () => {
    const cache = createTtlCache();
    let n = 0;
    const load = async () => {
      n += 1;
      throw new Error("nope");
    };
    await expect(cache.get("k", load, 1_000)).rejects.toThrow("nope");
    await expect(cache.get("k", load, 1_000)).rejects.toThrow("nope");
    expect(n).toBe(2);
  });

  it("invalidate drops an exact key and a prefix", async () => {
    const cache = createTtlCache();
    await cache.get("jira:search:a", async () => 1, 1_000);
    await cache.get("jira:test:a", async () => 2, 1_000);
    await cache.get("gh:status", async () => 3, 1_000);
    cache.invalidate("gh:status");
    cache.invalidate("jira:*");
    let jira = 0;
    let gh = 0;
    await cache.get("jira:search:a", async () => ++jira, 1_000);
    await cache.get("gh:status", async () => ++gh, 1_000);
    expect(jira).toBe(1);
    expect(gh).toBe(1);
  });

  it("force ignores a warm entry but still joins in-flight work", async () => {
    const cache = createTtlCache();
    let n = 0;
    expect(await cache.get("k", async () => ++n, 1_000)).toBe(1);
    expect(await cache.get("k", async () => ++n, 1_000, { force: true })).toBe(2);
    let started = 0;
    const load = () =>
      new Promise<number>((resolve) => {
        started += 1;
        setTimeout(() => resolve(++n), 15);
      });
    const [a, b] = await Promise.all([
      cache.get("k", load, 1_000, { force: true }),
      cache.get("k", load, 1_000, { force: true }),
    ]);
    expect(a).toBe(b);
    expect(started).toBe(1);
  });
});

describe("rate limit retry", () => {
  it("parses Retry-After seconds and HTTP dates", () => {
    expect(parseRetryAfterMs("2")).toBe(2_000);
    expect(parseRetryAfterMs("0")).toBe(0);
    const now = Date.parse("Wed, 21 Oct 2015 07:28:00 GMT");
    expect(parseRetryAfterMs("Wed, 21 Oct 2015 07:28:05 GMT", now)).toBe(5_000);
  });

  it("honors Retry-After then succeeds", async () => {
    const sleeps: number[] = [];
    setSleepForTests(async (ms) => {
      sleeps.push(ms);
    });
    let n = 0;
    const value = await withBackoff(async () => {
      n += 1;
      if (n === 1) throw new RateLimitError("Jira", 2_000);
      return "ok";
    }, "Jira");
    expect(value).toBe("ok");
    expect(sleeps).toEqual([2_000]);
    setSleepForTests();
  });

  it("surfaces a friendly message after retries are exhausted", async () => {
    setSleepForTests(async () => undefined);
    await expect(
      withBackoff(async () => {
        throw new RateLimitError("GitHub", 1_000);
      }, "GitHub"),
    ).rejects.toThrow("GitHub is rate limiting, retrying in 1s");
    setSleepForTests();
  });
});
