import {
  ImplementHandoffSchema,
  PlanHandoffSchema,
  ReviewHandoffSchema,
  parseAgentJson,
  routeAfterReview,
  type ReviewHandoff,
  type Run,
} from "@flightdeck/shared";
import { saveHandoff } from "../handoffs/store.ts";
import { implementPrompt, planPrompt, reviewPrompt } from "../agent/prompts.ts";
import { getRun, updateRun } from "./store.ts";
import { runAgentPhase, type PhaseResult } from "./execute.ts";

export async function orchestrate(run: Run): Promise<"ok" | "ask" | "error"> {
  const planned = await runPlan(run, 0);
  if (planned !== "ok") return planned;
  for (let round = 1; round <= run.maxRounds; round += 1) {
    const impl = await runImplement(live(run.id), round);
    if (impl !== "ok") return impl;
    const reviewed = await runReview(live(run.id), round);
    if (reviewed.status !== "ok" || !reviewed.review) return reviewed.status;
    const next = routeAfterReview(reviewed.review, round, live(run.id).maxRounds);
    if (next === "pr") return "ok";
    if (next === "plan") {
      const again = await runPlan(live(run.id), round);
      if (again !== "ok") return again;
    }
  }
  return "ok";
}

async function runPlan(run: Run, round: number): Promise<"ok" | "ask" | "error"> {
  updateRun(run.id, { phase: "plan", round, status: "running" });
  const res = await runAgentPhase(live(run.id), "planner", planPrompt(live(run.id)));
  if (res.status !== "ok") return res.status;
  const handoff = parseAgentJson(res.output, (v) => PlanHandoffSchema.parse(v));
  saveHandoff(run.id, "plan", round, handoff, live(run.id).worktreePath);
  return "ok";
}

async function runImplement(run: Run, round: number): Promise<"ok" | "ask" | "error"> {
  updateRun(run.id, { phase: "implement", round, status: "running" });
  const res = await runAgentPhase(live(run.id), "implementer", implementPrompt(live(run.id), round));
  if (res.status !== "ok") return res.status;
  const handoff = parseAgentJson(res.output, (v) => ImplementHandoffSchema.parse(v));
  saveHandoff(run.id, "implement", round, handoff, live(run.id).worktreePath);
  return "ok";
}

async function runReview(
  run: Run,
  round: number,
): Promise<{ status: "ok" | "ask" | "error"; review?: ReviewHandoff }> {
  updateRun(run.id, { phase: "review", round, status: "running" });
  const res: PhaseResult = await runAgentPhase(live(run.id), "reviewer", reviewPrompt(live(run.id), round));
  if (res.status !== "ok") return { status: res.status };
  const review = parseAgentJson(res.output, (v) => ReviewHandoffSchema.parse(v));
  saveHandoff(run.id, "review", round, review, live(run.id).worktreePath);
  return { status: "ok", review };
}

function live(id: number): Run {
  const run = getRun(id);
  if (!run) throw new Error("run missing");
  return run;
}
