import { describe, expect, it } from "vitest";
import { reduceReviews } from "./reviews.ts";

describe("reduceReviews", () => {
  it("lets a later approval override the same reviewer's changes-requested", () => {
    expect(
      reduceReviews([
        { user: { login: "pat" }, state: "CHANGES_REQUESTED" },
        { user: { login: "pat" }, state: "APPROVED" },
      ]),
    ).toBe("approved");
  });

  it("keeps changes-requested when another reviewer still wants changes", () => {
    expect(
      reduceReviews([
        { user: { login: "pat" }, state: "CHANGES_REQUESTED" },
        { user: { login: "sam" }, state: "APPROVED" },
      ]),
    ).toBe("changes_requested");
  });
});
