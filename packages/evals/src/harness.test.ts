import { describe, expect, it } from "vitest";
import { handoffEval, runEvals } from "./harness.ts";

describe("eval harness", () => {
  it("passes the built-in handoff case", () => {
    const r = runEvals([handoffEval]);
    expect(r.failed).toEqual([]);
    expect(r.passed).toBe(1);
  });
});
