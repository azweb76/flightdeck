import { describe, expect, it } from "vitest";
import { adfToMarkdown, markdownToAdf } from "./adf.ts";

describe("ADF round-trip", () => {
  it("converts headings, lists, and paragraphs", () => {
    const md = "## Goal\n\nShip CSV.\n\n- one\n- two";
    const adf = markdownToAdf(md);
    expect(adf.type).toBe("doc");
    expect(adf.content?.[0]?.type).toBe("heading");
    const back = adfToMarkdown(adf);
    expect(back).toContain("## Goal");
    expect(back).toContain("- one");
  });
});
