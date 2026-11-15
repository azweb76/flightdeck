import { describe, expect, it } from "vitest";
import { linesFromPatch, placeComments, summaryNotes } from "./diff.ts";

const patch = `@@ -20,4 +20,6 @@
 keep
-old
+added
 keep
+later
`;

describe("diff comment placement", () => {
  it("reads LEFT and RIGHT lines from a unified patch", () => {
    const lines = linesFromPatch("src/checkout.ts", patch);
    expect(lines.some((l) => l.side === "RIGHT" && l.line === 21)).toBe(true);
    expect(lines.some((l) => l.side === "LEFT" && l.path === "src/checkout.ts")).toBe(true);
  });

  it("keeps diffable comments inline and folds the rest into summary notes", () => {
    const placed = placeComments(
      [
        { path: "src/checkout.ts", line: 21, side: "RIGHT", body: "On the diff.", state: "approved", placement: "inline" },
        { path: "secret.md", line: 9, side: "RIGHT", body: "Not in the PR.", state: "approved", placement: "inline" },
      ],
      [{ filename: "src/checkout.ts", patch }],
    );
    expect(placed[0]?.placement).toBe("inline");
    expect(placed[1]?.placement).toBe("summary");
    expect(summaryNotes(placed)).toContain("secret.md:9");
    expect(summaryNotes(placed)).not.toContain("On the diff.");
  });
});
