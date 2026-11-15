import { beforeEach, describe, expect, it } from "vitest";
import { resetCacheForTests } from "../cache/store.ts";
import { CHECKS_GRACE_MS, commitChecks, summarize } from "./checks.ts";

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

  it("uses commit statuses when no check-runs exist", () => {
    expect(summarize("abc", "pending", [], [{ state: "pending" }]).state).toBe("pending");
    expect(summarize("abc", "failure", [], [{ state: "failure" }]).state).toBe("failing");
    expect(summarize("abc", "success", [], [{ state: "success" }]).state).toBe("passing");
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
