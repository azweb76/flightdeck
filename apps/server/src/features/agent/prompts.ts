import type { AgentRole, ClarifyQuestion, Issue, Run } from "@flightdeck/shared";
import { latestHandoff } from "../handoffs/store.ts";
import { latestGoal } from "../goals/store.ts";
import { appliedPrompt } from "./prompt-versions.ts";

function withApplied(role: AgentRole, body: string): string {
  const extra = appliedPrompt(role).trim();
  return extra ? `${body}\n\nApplied prompt version:\n${extra}` : body;
}

export function refineQuestionsPrompt(issue: Issue): string {
  return withApplied("refiner", [
    "You are the Flightdeck refiner. Read the codebase if a cwd is given.",
    "Ask clarifying questions only. Do not write a plan or code.",
    `Issue ${issue.key}: ${issue.title}`,
    issue.body,
    "Reply with JSON only:",
    '{"kind":"refine_questions","questions":[{"id":"q1","prompt":"...","options":[{"id":"a","label":"..."},{"id":"b","label":"..."}],"allowOther":true}]}',
  ].join("\n\n"));
}

export function refineGoalPrompt(
  issue: Issue,
  answers: { questionId: string; optionId?: string; other?: string }[],
  questions: ClarifyQuestion[],
): string {
  const lines = questions.map((q) => {
    const a = answers.find((x) => x.questionId === q.id);
    const picked = q.options.find((o) => o.id === a?.optionId)?.label;
    return `- ${q.prompt}: ${a?.other || picked || "unanswered"}`;
  });
  return withApplied("refiner", [
    "You are the Flightdeck refiner. Write a goal with acceptance criteria and constraints. No plan, no code.",
    `Issue ${issue.key}: ${issue.title}`,
    issue.body,
    "Answers:",
    ...lines,
    "Reply with JSON only:",
    '{"kind":"refine_goal","markdown":"## Goal\\n...\\n## Acceptance criteria\\n...\\n## Constraints\\n..."}',
  ].join("\n"));
}

export function planPrompt(run: Run): string {
  const goal = latestGoal(run.issueId);
  const review = latestHandoff(run.id, "review");
  return withApplied("planner", [
    "You are the Flightdeck planner. Write or revise a plan, not code.",
    `Issue ${run.issueKey}: ${run.issueTitle}`,
    goal?.markdown ?? "Use the issue title as the goal.",
    review ? `Previous review:\n${JSON.stringify(review)}` : "",
    "Reply with JSON only:",
    '{"kind":"plan","summary":"...","steps":["..."],"files":[]}',
  ]
    .filter(Boolean)
    .join("\n\n"));
}

export function implementPrompt(run: Run, round: number): string {
  const plan = latestHandoff(run.id, "plan");
  const review = latestHandoff(run.id, "review");
  return withApplied("implementer", [
    `Implement round ${round}/${run.maxRounds} for ${run.issueKey} in this worktree.`,
    "Follow CLAUDE.md and stay inside the worktree.",
    plan ? `Plan:\n${JSON.stringify(plan)}` : "",
    review ? `Findings to address:\n${JSON.stringify(review)}` : "",
    "Reply with JSON only:",
    '{"kind":"implement","summary":"...","filesChanged":[],"testsRun":[],"remaining":""}',
  ]
    .filter(Boolean)
    .join("\n\n"));
}

export function reviewPrompt(run: Run, round: number): string {
  return withApplied("reviewer", [
    `Review round ${round} of ${run.issueKey}.`,
    "Check acceptance criteria and constraints, tests/lint/build, conventions, security, missing tests.",
    "Tag each finding minor (implementer) or major (planner).",
    "Reply with JSON only:",
    '{"kind":"review","passed":false,"findings":[{"severity":"minor","title":"...","detail":"..."}],"notes":""}',
  ].join("\n"));
}

export function sessionReviewPrompt(issueKey: string, transcript: string): string {
  return withApplied(
    "session_reviewer",
    [
      "You are the Flightdeck session reviewer. Score the transcript and propose improvements.",
      `Issue ${issueKey}.`,
      transcript.slice(0, 8000),
      "Reply with JSON only:",
      '{"kind":"session_review","waste":3,"backtracking":1,"prQuality":8,"stuck":2,"missingContext":4,"notes":"...","findings":[{"title":"...","detail":"...","excerpt":"..."}],"improvements":[{"kind":"prompt_edit","title":"...","detail":"...","patch":"..."}]}',
    ].join("\n\n"),
  );
}

export function prReviewPrompt(repoSlug: string, prNumber: number, title: string, diff: string): string {
  return withApplied(
    "reviewer",
    [
      "You review a teammate PR. Draft inline review comments. Do not submit them.",
      `${repoSlug}#${prNumber} ${title}`,
      diff.slice(0, 8000),
      "Reply with JSON only:",
      '{"kind":"pr_review","comments":[{"path":"src/index.ts","line":1,"body":"..."}]}',
    ].join("\n\n"),
  );
}
