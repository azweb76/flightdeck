import { describe, expect, it } from "vitest";
import { hideAskingFooter } from "./askingFooter.ts";

describe("hideAskingFooter", () => {
  it("hides the footer on the run that owns the question", () => {
    expect(hideAskingFooter("/runs/4", "/runs/4")).toBe(true);
    expect(hideAskingFooter("/", "/?item=run:4")).toBe(true);
  });

  it("keeps the footer on other pages", () => {
    expect(hideAskingFooter("/issues", "/runs/4")).toBe(false);
    expect(hideAskingFooter("/runs", "/runs/4")).toBe(false);
    expect(hideAskingFooter("/runs/3", "/runs/4")).toBe(false);
    expect(hideAskingFooter("/runs/4", undefined)).toBe(false);
  });
});
