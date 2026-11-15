import { describe, expect, it } from "vitest";
import { abortJob, attachAbort } from "./jobs.ts";

describe("attachAbort", () => {
  it("aborts the previous controller for the same id", () => {
    const first = attachAbort("review-1");
    const second = attachAbort("review-1");
    expect(first.signal.aborted).toBe(true);
    expect(second.signal.aborted).toBe(false);
    abortJob("review-1");
    expect(second.signal.aborted).toBe(true);
  });
});
