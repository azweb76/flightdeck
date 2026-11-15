import { describe, expect, it } from "vitest";
import { occupiesReviewSlot } from "./review.ts";

describe("occupiesReviewSlot", () => {
  it("holds a slot only while Claude is reviewing", () => {
    expect(occupiesReviewSlot("reviewing")).toBe(true);
    expect(occupiesReviewSlot("queued")).toBe(false);
    expect(occupiesReviewSlot("drafts")).toBe(false);
    expect(occupiesReviewSlot("posted")).toBe(false);
    expect(occupiesReviewSlot("selected")).toBe(false);
  });
});
