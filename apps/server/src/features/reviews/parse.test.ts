import { describe, expect, it } from "vitest";
import { parseReviewDraft } from "./parse.ts";

describe("parseReviewDraft", () => {
  it("reads a summary and JSON comments", () => {
    const parsed = parseReviewDraft(
      'Looks close.\n```json\n[{"path":"a.ts","line":3,"body":"Guard this"}]\n```',
    );
    expect(parsed.summary).toBe("Looks close.");
    expect(parsed.comments).toEqual([{ path: "a.ts", line: 3, body: "Guard this" }]);
  });

  it("keeps Claude's LEFT or RIGHT side from the JSON", () => {
    const parsed = parseReviewDraft('```json\n[{"path":"a.ts","line":4,"side":"LEFT","body":"Old line"}]\n```');
    expect(parsed.comments[0]?.side).toBe("LEFT");
  });

  it("drops invalid comments and missing fences", () => {
    expect(parseReviewDraft("Just a summary.").comments).toEqual([]);
    expect(parseReviewDraft('```json\n[{"path":"","line":0,"body":"x"}]\n```').comments).toEqual([]);
  });
});
