import { describe, expect, it } from "vitest";
import { extractJsonObject } from "./parse-json.ts";

describe("extractJsonObject", () => {
  it("reads a fenced json block", () => {
    expect(extractJsonObject("note\n```json\n{\"a\":1}\n```")).toEqual({ a: 1 });
  });
});
