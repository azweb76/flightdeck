import { describe, expect, it } from "vitest";
import { handoffEval, reviewHandoffEval, runEvals } from "./harness.ts";

describe("eval harness", () => {
  it("passes the built-in handoff case", () => {
    const r = runEvals([handoffEval, reviewHandoffEval]);
    expect(r.failed).toEqual([]);
    expect(r.passed).toBe(2);
  });
});
