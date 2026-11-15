import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const CANDIDATES = [".cursor/skills/review/SKILL.md", ".claude/skills/review/SKILL.md", ".claude/skills/review"];

export function detectReviewSkill(cwd: string): { path: string; text: string } | undefined {
  for (const rel of CANDIDATES) {
    const full = join(cwd, rel);
    if (!existsSync(full)) continue;
    if (statSync(full).isDirectory()) continue;
    const text = readFileSync(full, "utf8").trim();
    if (text) return { path: rel, text };
  }
  return undefined;
}

export const DEFAULT_REVIEW_PROMPT = `Review this pull request as a careful teammate.
Look for bugs, missing tests, security issues, and unmet acceptance criteria.
Reply with a short summary, then a JSON array of inline comments:

\`\`\`json
[{ "path": "file.ts", "line": 12, "body": "Comment text" }]
\`\`\`

Use RIGHT-side lines on the new file. Skip nitpicks. If there are no comments, return [].`;
