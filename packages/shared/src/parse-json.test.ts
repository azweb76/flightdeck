import { describe, expect, it } from "vitest";
import { extractJsonObject } from "./parse-json.ts";

describe("extractJsonObject", () => {
  it("reads a fenced json block", () => {
    const v = extractJsonObject('noise\n```json\n{"kind":"plan","ok":true}\n```\n');
    expect(v).toEqual({ kind: "plan", ok: true });
  });

  it("reads the first balanced object", () => {
    const v = extractJsonObject('prefix {"kind":"review","passed":true} suffix');
    expect(v).toEqual({ kind: "review", passed: true });
  });

  it("throws when there is no object", () => {
    expect(() => extractJsonObject("no json here")).toThrow(/No JSON/);
  });
});
