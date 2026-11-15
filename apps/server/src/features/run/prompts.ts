import type { Change } from "@flightdeck/shared";

export function issueContext(change: Pick<Change, "issueKey" | "title" | "issueBody">): string {
  const body = change.issueBody.trim() || "(no issue body)";
  return `Issue ${change.issueKey}: ${change.title}

The shaped issue (goal, acceptance criteria, files, approach, out of scope, test plan):

${body}`;
}

export function planPrompt(change: Change): string {
  return `You are planning a hands-off implementation. Do not write files yet. Do not put the plan in the repo.
${issueContext(change)}
Write a short numbered plan that covers every acceptance criterion.`;
}

export function implementPrompt(change: Change, answer?: string): string {
  const guidance = answer ? `\nDan answered (this implement round only): ${answer}` : "";
  return `Implement this change in the worktree. Tests, lint, typecheck and build must pass.
${issueContext(change)}
Plan (app only): ${change.planText}${guidance}
Do not commit the plan file.`;
}

export function ciFixPrompt(change: Change, summary: string, answer?: string): string {
  const guidance = answer ? `\nDan answered: ${answer}` : "";
  return `CI failed on the draft PR. Fix the failures in this worktree and keep tests, lint, typecheck, and build passing.
${issueContext(change)}
CI: ${summary}${guidance}
Do not commit the plan file.`;
}

export function reviewPrompt(change: Change): string {
  return `You are a fresh reviewer. You did not write this code. Check the diff against every acceptance criterion.
${issueContext(change)}
End with APPROVE if every criterion is met, or CHANGES_NEEDED with a bullet list if not.
This is review round ${change.reviewRound}${change.reviewRound > 3 ? " (follow-up after Dan answered)" : " of 3"}.`;
}
