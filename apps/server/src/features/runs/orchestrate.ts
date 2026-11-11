import { HandoffSchema, type Run } from "@flightdeck/shared";
import { saveHandoff } from "../handoffs/store.ts";
import { latestGoal } from "../goals/store.ts";
import { getRun, updateRun } from "./store.ts";
import { runAgentPhase } from "./execute.ts";

export async function orchestrate(run: Run): Promise<"ok" | "ask" | "error"> {
  const live = () => getRun(run.id)!;
  const plan = await phase(live(), "plan", 0, "planner", planPrompt(run));
  if (plan !== "ok") return plan;
  saveHandoff(
    run.id,
    "plan",
    0,
    HandoffSchema.parse({
      kind: "plan",
      summary: `Plan for ${run.issueKey}`,
      steps: ["Implement the goal", "Add tests", "Open a PR"],
    }),
    live().worktreePath,
  );
  for (let round = 1; round <= run.maxRounds; round += 1) {
    updateRun(run.id, { round, phase: "implement" });
    const impl = await phase(live(), "implement", round, "implementer", implementPrompt(run, round));
    if (impl !== "ok") return impl;
    saveHandoff(
      run.id,
      "implement",
      round,
      HandoffSchema.parse({
        kind: "implement",
        summary: `Implement round ${round}`,
        filesChanged: [],
        testsRun: [],
      }),
      live().worktreePath,
    );
    updateRun(run.id, { phase: "review" });
    const rev = await phase(live(), "review", round, "reviewer", reviewPrompt(run, round));
    if (rev !== "ok") return rev;
    saveHandoff(
      run.id,
      "review",
      round,
      HandoffSchema.parse({
        kind: "review",
        passed: round === run.maxRounds,
        findings:
          round === run.maxRounds
            ? []
            : [{ severity: "minor", title: "Follow-up", detail: "Address remaining polish." }],
        notes: "",
      }),
      live().worktreePath,
    );
  }
  return "ok";
}

async function phase(
  run: Run,
  name: Run["phase"],
  round: number,
  role: "planner" | "implementer" | "reviewer",
  prompt: string,
): Promise<"ok" | "ask" | "error"> {
  updateRun(run.id, { phase: name, round, status: "running" });
  return runAgentPhase(getRun(run.id)!, role, prompt);
}

function planPrompt(run: Run): string {
  const goal = latestGoal(run.issueId);
  return `Write a plan (not code) for ${run.issueKey}.\n\n${goal?.markdown ?? run.issueTitle}`;
}

function implementPrompt(run: Run, round: number): string {
  return `Implement round ${round}/${run.maxRounds} for ${run.issueKey}. Read .flightdeck/*.md handoffs.`;
}

function reviewPrompt(run: Run, round: number): string {
  return [
    `Review round ${round} of ${run.issueKey}.`,
    "Check acceptance criteria, tests/lint/build, conventions, security, missing tests.",
    "Tag findings minor (implementer) or major (planner).",
  ].join("\n");
}
