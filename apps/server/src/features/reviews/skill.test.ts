import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_REVIEW_PROMPT, detectReviewSkill } from "./skill.ts";

describe("detectReviewSkill", () => {
  it("prefers .cursor/skills/review/SKILL.md", () => {
    const cwd = mkdtempSync(join(tmpdir(), "fd-skill-"));
    mkdirSync(join(cwd, ".cursor", "skills", "review"), { recursive: true });
    writeFileSync(join(cwd, ".cursor", "skills", "review", "SKILL.md"), "Check tests first.");
    expect(detectReviewSkill(cwd)).toEqual({ path: ".cursor/skills/review/SKILL.md", text: "Check tests first." });
  });

  it("falls back to .claude/skills/review and then the default prompt", () => {
    const cwd = mkdtempSync(join(tmpdir(), "fd-skill-"));
    mkdirSync(join(cwd, ".claude", "skills"), { recursive: true });
    writeFileSync(join(cwd, ".claude", "skills", "review"), "Claude skill file.");
    expect(detectReviewSkill(cwd)?.path).toBe(".claude/skills/review");
    expect(detectReviewSkill(mkdtempSync(join(tmpdir(), "fd-none-")))).toBeUndefined();
    expect(DEFAULT_REVIEW_PROMPT).toMatch(/bugs/i);
  });
});
