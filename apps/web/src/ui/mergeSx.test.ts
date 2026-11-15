import { describe, expect, it } from "vitest";
import { mergeSx } from "./mergeSx.ts";

describe("mergeSx", () => {
  it("keeps caller sx in array form", () => {
    expect(mergeSx({ mt: 2 })).toEqual([{ mt: 2 }]);
    expect(mergeSx({ color: "red" }, [{ mt: 1 }, { mb: 1 }])).toEqual([{ color: "red" }, { mt: 1 }, { mb: 1 }]);
  });
});
