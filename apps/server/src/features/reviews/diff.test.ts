import { describe, expect, it } from "vitest";
import { githubReviewBody, linesFromPatch, placeComments, summaryNotes } from "./diff.ts";

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

  it("treats context lines as both LEFT and RIGHT and ignores a trailing empty split", () => {
    const lines = linesFromPatch("src/checkout.ts", patch);
    expect(lines).toContainEqual({ path: "src/checkout.ts", line: 20, side: "RIGHT" });
    expect(lines).toContainEqual({ path: "src/checkout.ts", line: 20, side: "LEFT" });
    const placed = placeComments(
      [{ path: "src/checkout.ts", line: 20, side: "LEFT", body: "On context.", state: "approved", placement: "inline" }],
      [{ filename: "src/checkout.ts", patch }],
    );
    expect(placed[0]?.placement).toBe("inline");
    expect(placed[0]?.side).toBe("LEFT");
  });

  it("maps a rename's previous_filename onto the new path when the line is in the patch", () => {
    const renamed = [{ filename: "src/b.ts", previous_filename: "src/a.ts", patch: "@@ -1,1 +1,2 @@\n keep\n+added\n" }];
    const placed = placeComments(
      [{ path: "src/a.ts", line: 1, side: "RIGHT", body: "Moved.", state: "draft", placement: "inline" }],
      renamed,
    );
    expect(placed[0]).toMatchObject({ placement: "inline", path: "src/b.ts", line: 1 });
  });

  it("folds comments on binary files with no patch into summary notes", () => {
    const placed = placeComments(
      [{ path: "logo.png", line: 1, side: "RIGHT", body: "Binary.", state: "draft", placement: "inline" }],
      [{ filename: "logo.png" }],
    );
    expect(placed[0]?.placement).toBe("summary");
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

  it("posts approved off-diff notes once and skips discarded ones", () => {
    const comments = [
      { path: "keep.md", line: 2, body: "Keep me", placement: "summary", state: "approved" },
      { path: "gone.md", line: 1, body: "Discard me", placement: "summary", state: "discarded" },
      { path: "a.ts", line: 1, body: "Draft", placement: "summary", state: "draft" },
    ];
    const baked = "Looks close.\n\nNotes not attached to the diff:\n- keep.md:2: Keep me";
    const body = githubReviewBody(baked, comments);
    expect(body.match(/Keep me/g)).toHaveLength(1);
    expect(body).not.toContain("Discard me");
    expect(body).not.toContain("Draft");
    expect(body.startsWith("Looks close.")).toBe(true);
  });
});
