import { describe, expect, it } from "vitest";
import { extraRoundLabel, reviewRoundCaption } from "./change.ts";
import { githubEnvFailDetail } from "./meta.ts";

describe("review round captions", () => {
  it("uses follow-up copy after the third round", () => {
    expect(reviewRoundCaption(0)).toBe("Waiting");
    expect(reviewRoundCaption(3)).toBe("Round 3 of 3");
    expect(reviewRoundCaption(4)).toBe("Follow-up after Dan answered");
    expect(reviewRoundCaption(4)).not.toContain("of 3");
    expect(extraRoundLabel(4)).toBe("Follow-up after Dan answered");
    expect(extraRoundLabel(1)).toBe("Round 1");
  });
});

describe("githubEnvFailDetail", () => {
  it("does not mix no-token copy with an env source label", () => {
    expect(githubEnvFailDetail("GITHUB_TOKEN")).toBe("GitHub token from GITHUB_TOKEN was rejected");
    expect(githubEnvFailDetail("GITHUB_TOKEN")).not.toMatch(/No GitHub token stored/);
    expect(githubEnvFailDetail()).toBe("No GitHub token stored");
  });
});
