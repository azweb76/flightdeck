export type PrBodyInput = {
  why: string;
  summary: string;
  changes: string[];
  tested: string;
  remaining: string;
  issues: string[];
};

export function formatPrBody(input: PrBodyInput): string {
  const changes = input.changes.map((c) => `- ${c}`).join("\n") || "- (none listed)";
  const issues = input.issues.map((i) => `- ${i}`).join("\n") || "- (none)";
  return [
    "## Why the change",
    input.why.trim(),
    "",
    "## High-level summary",
    input.summary.trim(),
    "",
    "## Main changes",
    changes,
    "",
    "## How it was tested",
    input.tested.trim(),
    "",
    "## Testing still remaining",
    input.remaining.trim(),
    "",
    "## Linked issues",
    issues,
    "",
  ].join("\n");
}

export function defaultCommitMessage(key: string, title: string, convention?: string): string {
  const prefix = convention?.trim() || "fix";
  const head = prefix.endsWith(":") ? prefix : `${prefix}:`;
  return `${head} ${key} ${title}`.slice(0, 72);
}
