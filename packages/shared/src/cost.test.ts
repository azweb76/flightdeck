import { describe, expect, it } from "vitest";
import { roundUsd, usageUsd } from "./cost.ts";

describe("usageUsd", () => {
  it("prices 1M in / 1M out at the default rates", () => {
    expect(usageUsd(1_000_000, 1_000_000)).toBe(18);
  });
  it("rounds to four decimals", () => {
    expect(roundUsd(1.23456)).toBe(1.2346);
  });
});
