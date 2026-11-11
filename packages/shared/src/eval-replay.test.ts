import { describe, expect, it } from "vitest";
import { replayEvalCase, replayEvalCases, scoreRegressed } from "./eval-replay.ts";

describe("replayEvalCase", () => {
  it("accepts a valid plan handoff", () => {
    expect(
      replayEvalCase({
        name: "plan",
        kind: "handoff",
        fixture: { kind: "plan", summary: "Ship", steps: ["write"] },
      }).passed,
    ).toBe(true);
  });

  it("rejects an invalid session score", () => {
    expect(replayEvalCase({ name: "s", kind: "session_replay", fixture: { waste: 99 } }).passed).toBe(
      false,
    );
  });

  it("fails the batch when any case fails", () => {
    const r = replayEvalCases([
      { name: "ok", kind: "handoff", fixture: { kind: "plan", summary: "x", steps: ["a"] } },
      { name: "bad", kind: "handoff", fixture: { kind: "nope" } },
    ]);
    expect(r.passed).toBe(false);
    expect(r.failed[0]).toContain("bad");
  });

  it("does not treat prompt_replay as a Zod-only pass", () => {
    expect(
      replayEvalCase({
        name: "p",
        kind: "prompt_replay",
        fixture: { input: "x", expect: { requireTests: true } },
      }).passed,
    ).toBe(false);
  });

  it("detects a worse session score", () => {
    const base = { waste: 3, backtracking: 1, prQuality: 8, stuck: 2, missingContext: 4, notes: "a" };
    expect(scoreRegressed({ ...base, waste: 7 }, base)).toBe(true);
    expect(scoreRegressed(base, base)).toBe(false);
  });
});
