import { describe, expect, it } from "vitest";
import { handoffEval, replayStored, reviewHandoffEval, runEvals } from "./harness.ts";

describe("eval harness", () => {
  it("passes the built-in handoff case", () => {
    const r = runEvals([handoffEval, reviewHandoffEval]);
    expect(r.failed).toEqual([]);
    expect(r.passed).toBe(2);
  });

  it("replays stored eval_cases fixtures", () => {
    const r = replayStored([
      { name: "plan", kind: "handoff", fixture: { kind: "plan", summary: "Ship", steps: ["a"] } },
    ]);
    expect(r.passed).toBe(true);
  });
});
