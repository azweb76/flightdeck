import { describe, expect, it } from "vitest";
import { nextKeyAction } from "./keys.ts";

describe("nextKeyAction", () => {
  it("moves with j/k, expands with Enter, and maps 1-9", () => {
    expect(nextKeyAction("j", false)).toEqual({ kind: "down" });
    expect(nextKeyAction("k", false)).toEqual({ kind: "up" });
    expect(nextKeyAction("Enter", false)).toEqual({ kind: "expand" });
    expect(nextKeyAction("3", false)).toEqual({ kind: "option", n: 3 });
  });

  it("ignores keys while typing a reply", () => {
    expect(nextKeyAction("j", true)).toBeUndefined();
    expect(nextKeyAction("1", true)).toBeUndefined();
  });
});
