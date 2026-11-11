import { describe, expect, it } from "vitest";
import { isNetworkFailure } from "./network.ts";

describe("isNetworkFailure", () => {
  it("treats DNS/connect failures as offline and Jira 400 bodies as not", () => {
    expect(isNetworkFailure(new Error("ENOTFOUND atlassian.net"))).toBe(true);
    expect(isNetworkFailure(new Error("fetch failed"))).toBe(true);
    expect(
      isNetworkFailure(
        new Error(
          'Jira search failed (400): Error in the JQL Query: Expecting operator but got \'AND\'.',
        ),
      ),
    ).toBe(false);
    expect(isNetworkFailure(new Error("Jira search failed (401): Unauthorized"))).toBe(false);
  });
});
