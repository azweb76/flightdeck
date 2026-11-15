import { beforeEach, describe, expect, it } from "vitest";
import { resetCacheForTests } from "../cache/store.ts";
import { CHECKS_GRACE_MS, commitChecks, graceSinceMs, summarize } from "./checks.ts";

describe("commit checks", () => {
  beforeEach(() => resetCacheForTests());

  it("summarizes pending, failing, and passing", () => {
    expect(summarize("abc", "failure", [{ status: "completed", conclusion: "failure" }]).state).toBe("failing");
    expect(summarize("abc", "success", [{ status: "completed", conclusion: "success" }]).state).toBe("passing");
    expect(summarize("abc", "pending", [{ status: "in_progress", conclusion: null }]).state).toBe("pending");
  });

  it("uses check-runs as source of truth for Actions-only repos", () => {
    const passing = summarize(
      "abc",
      "pending",
      [
        { status: "completed", conclusion: "success" },
        { status: "completed", conclusion: "skipped" },
        { status: "completed", conclusion: "neutral" },
      ],
      [],
    );
    expect(passing.state).toBe("passing");
    expect(summarize("abc", "pending", [], []).state).toBe("pending");
  });

  it("keeps empty checks pending until combined success after the grace period", () => {
    const opened = 1_000_000;
    expect(summarize("abc", "pending", [], [], { sinceMs: opened, now: opened + 1_000 }).state).toBe("pending");
    expect(
      summarize("abc", "success", [], [], { sinceMs: opened, now: opened + CHECKS_GRACE_MS - 1 }).state,
    ).toBe("pending");
    expect(
      summarize("abc", "success", [], [], { sinceMs: opened, now: opened + CHECKS_GRACE_MS }).state,
    ).toBe("passing");
    expect(summarize("abc", "neutral", [], []).state).toBe("passing");
    expect(summarize("abc", "failure", [], []).state).toBe("failing");
  });

  it("keeps empty success pending 1s after a push on a PR that is an hour old", () => {
    const created = Date.parse("2026-11-15T11:00:00.000Z");
    const pushed = Date.parse("2026-11-15T11:59:59.000Z");
    const now = Date.parse("2026-11-15T12:00:00.000Z");
    const since = graceSinceMs(
      { ciPushedAt: new Date(pushed).toISOString(), updatedAt: new Date(created).toISOString() },
      { createdAt: new Date(created).toISOString(), updatedAt: new Date(created).toISOString() },
    );
    expect(since).toBe(pushed);
    expect(summarize("abc", "success", [], [], { sinceMs: since, now }).state).toBe("pending");
  });

  it("uses the head commit time when ciPushedAt is missing", () => {
    const created = Date.parse("2026-11-15T11:00:00.000Z");
    const committed = Date.parse("2026-11-15T11:59:59.000Z");
    const since = graceSinceMs(
      { updatedAt: new Date(created).toISOString() },
      {
        createdAt: new Date(created).toISOString(),
        updatedAt: new Date(created).toISOString(),
        committedAt: new Date(committed).toISOString(),
      },
    );
    expect(since).toBe(committed);
  });

  it("uses commit statuses when no check-runs exist", () => {
    expect(summarize("abc", "pending", [], [{ state: "pending" }]).state).toBe("pending");
    expect(summarize("abc", "failure", [], [{ state: "failure" }]).state).toBe("failing");
    expect(summarize("abc", "success", [], [{ state: "success" }]).state).toBe("passing");
  });

  it("keeps cancelled-or-skipped-only checks pending through the grace period", () => {
    const opened = 1_000_000;
    const inert = [
      { status: "completed", conclusion: "cancelled" },
      { status: "completed", conclusion: "skipped" },
    ];
    expect(summarize("abc", "success", inert, [], { sinceMs: opened, now: opened + 1_000 }).state).toBe("pending");
    expect(summarize("abc", "success", inert, [], { sinceMs: opened, now: opened + CHECKS_GRACE_MS }).state).toBe(
      "passing",
    );
  });

  it("ignores cancelled runs and surfaces action_required", () => {
    expect(summarize("abc", "success", [{ status: "completed", conclusion: "cancelled" }]).state).toBe("passing");
    expect(summarize("abc", "success", [{ status: "completed", conclusion: "skipped" }]).state).toBe("passing");
    expect(summarize("abc", "success", [{ status: "completed", conclusion: "neutral" }]).state).toBe("passing");
    expect(summarize("abc", "success", [{ status: "completed", conclusion: "action_required" }]).state).toBe(
      "action_required",
    );
    expect(
      summarize("abc", "success", [
        { status: "completed", conclusion: "cancelled" },
        { status: "completed", conclusion: "failure" },
      ]).state,
    ).toBe("failing");
  });

  it("combines Actions runs with real commit statuses", () => {
    expect(
      summarize("abc", "pending", [{ status: "completed", conclusion: "success" }], [{ state: "pending" }]).state,
    ).toBe("pending");
    expect(
      summarize("abc", "failure", [{ status: "completed", conclusion: "success" }], [{ state: "failure" }]).state,
    ).toBe("failing");
    expect(
      summarize("abc", "success", [{ status: "completed", conclusion: "success" }], [{ state: "success" }]).state,
    ).toBe("passing");
  });

  it("caches checks and sends If-None-Match on a fresh refetch", async () => {
    const seen: string[] = [];
    let round = 0;
    const fetchFn = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
      seen.push(`${(init?.method ?? "GET").toUpperCase()} ${url.pathname}`);
      const inm = new Headers(init?.headers).get("if-none-match") || new Headers(init?.headers).get("If-None-Match");
      if (inm === "W/\"c1\"" && round > 0) return new Response(null, { status: 304, headers: { etag: 'W/"c1"' } });
      if (url.pathname.endsWith("/status")) {
        return json({ state: "success", statuses: [] }, { etag: 'W/"c1"' });
      }
      if (url.pathname.endsWith("/check-runs")) {
        return json({ check_runs: [{ status: "completed", conclusion: "success" }] }, { etag: 'W/"c1"' });
      }
      return json({ message: url.pathname }, {}, 500);
    }) as typeof fetch;

    const first = await commitChecks("t", fetchFn, "acme", "web", "main");
    expect(first.state).toBe("passing");
    round = 1;
    const second = await commitChecks("t", fetchFn, "acme", "web", "main", { fresh: true });
    expect(second.state).toBe("passing");
    expect(seen.some((s) => s.includes("/status"))).toBe(true);
    expect(seen.some((s) => s.includes("/check-runs"))).toBe(true);
  });
});

function json(body: unknown, headers: Record<string, string> = {}, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}
