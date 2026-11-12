import { draftToMarkdown, type IssueDraft } from "@flightdeck/shared";

export function shapePrompt(input: {
  idea?: string;
  issueBody?: string;
  draft: IssueDraft;
  history: string;
  reply?: string;
}): string {
  const first = input.reply ? "" : "first turn: ";
  const answer = input.reply ? `answer: ${input.reply}\n` : "";
  return [
    "You are shaping a software change into a GitHub or Jira issue.",
    "The git repo is your working directory. Use Read, Glob and Grep only. Do not edit files.",
    "Ask clarifying questions when you need a decision.",
    "Keep the issue draft in this JSON shape (and emit an updated copy whenever it changes):",
    '{"title":"","goal":"","acceptance":"","files":"","approach":"","outOfScope":"","testPlan":""}',
    "",
    input.idea ? `${first}New idea:\n${input.idea}` : "",
    input.issueBody ? `Existing issue:\n${input.issueBody}` : "",
    "",
    "Current draft markdown:",
    draftToMarkdown(input.draft),
    "",
    input.history,
    answer,
  ]
    .filter(Boolean)
    .join("\n");
}
