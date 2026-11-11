import { describe, expect, it } from "vitest";
import { replayEvalCase, replayEvalCases } from "./eval-replay.ts";

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
});
