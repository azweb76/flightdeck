import { describe, expect, it } from "vitest";
import { abortRun, bindAbort } from "./abort.ts";

describe("abort", () => {
  it("aborts the bound signal", () => {
    const signal = bindAbort(9);
    expect(signal.aborted).toBe(false);
    abortRun(9);
    expect(signal.aborted).toBe(true);
  });
});
