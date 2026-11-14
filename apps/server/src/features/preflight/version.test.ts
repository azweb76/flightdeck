import { describe, expect, it } from "vitest";
import { meetsMin, minFromRange, parseTriple } from "./version.ts";

describe("version compare", () => {
  it("parses git and node version strings", () => {
    expect(parseTriple("v22.13.0")).toEqual([22, 13, 0]);
    expect(parseTriple("git version 2.47.1")).toEqual([2, 47, 1]);
    expect(minFromRange(">=22.13.0")).toEqual([22, 13, 0]);
  });

  it("accepts versions at or above the engines range", () => {
    expect(meetsMin("22.13.0", ">=22.13.0")).toBe(true);
    expect(meetsMin("22.12.0", ">=22.13.0")).toBe(false);
    expect(meetsMin("2.19.9", ">=2.20.0")).toBe(false);
    expect(meetsMin("2.20.0", ">=2.20.0")).toBe(true);
  });
});
