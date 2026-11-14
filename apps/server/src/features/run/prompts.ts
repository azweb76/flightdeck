import type { Change } from "@flightdeck/shared";

export function planPrompt(change: Change): string {
  return `You are planning a hands-off implementation. Do not write files yet. Do not put the plan in the repo.
Issue ${change.issueKey}: ${change.title}
Write a short numbered plan.`;
}

export function implementPrompt(change: Change, answer?: string): string {
  return `Implement this change in the worktree. Tests, lint, typecheck and build must pass.
Issue ${change.issueKey}: ${change.title}
Plan (app only): ${change.planText}
${answer ? `Dan answered: ${answer}` : ""}
Do not commit the plan file.`;
}

export function reviewPrompt(change: Change): string {
  return `You are a fresh reviewer. You did not write this code. Check the diff against every acceptance criterion.
Issue ${change.issueKey}: ${change.title}
End with APPROVE if every criterion is met, or CHANGES_NEEDED with a bullet list if not.
This is review round ${change.reviewRound} of 3.`;
}
