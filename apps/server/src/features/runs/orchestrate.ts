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
import type { InjectMode } from "../messages/index.ts";

export async function orchestrate(run: Run, resuming = false): Promise<"ok" | "ask" | "error"> {
  let inject: InjectMode = resuming ? "resume" : "start";
  if (!resuming && live(run.id).phase === "plan" && live(run.id).round === 0) {
    const planned = await runPlan(live(run.id), 0, inject);
    inject = "start";
    if (planned !== "ok") return planned;
    updateRun(run.id, { phase: "implement", round: 1 });
  } else if (resuming && live(run.id).phase === "plan") {
    const planned = await runPlan(live(run.id), live(run.id).round, inject);
    inject = "start";
    if (planned !== "ok") return planned;
    updateRun(run.id, { phase: "implement", round: Math.max(live(run.id).round, 1) });
  }
  return loopFrom(live(run.id), inject);
}

async function loopFrom(run: Run, inject: InjectMode): Promise<"ok" | "ask" | "error"> {
  for (;;) {
    const current = live(run.id);
    if (current.phase === "plan") {
      const planned = await runPlan(current, current.round, inject);
      inject = "start";
      if (planned !== "ok") return planned;
      updateRun(current.id, { phase: "implement", round: Math.max(current.round, 1) });
      continue;
    }
    if (current.phase === "implement" || current.phase === "fix") {
      const impl = await runImplement(current, Math.max(current.round, 1), inject);
      inject = "start";
      if (impl !== "ok") return impl;
      updateRun(current.id, { phase: "review" });
      continue;
    }
    if (current.phase === "review") {
      const reviewed = await runReview(current, Math.max(current.round, 1), inject);
      inject = "start";
      if (reviewed.status !== "ok" || !reviewed.review) return reviewed.status;
      const next = routeAfterReview(reviewed.review, current.round, current.maxRounds);
      if (next === "pr") return "ok";
      if (next === "plan") {
        updateRun(current.id, { phase: "plan" });
        continue;
      }
      updateRun(current.id, { phase: "implement", round: current.round + 1 });
      continue;
    }
    return "ok";
  }
}

async function runPlan(run: Run, round: number, inject: InjectMode): Promise<"ok" | "ask" | "error"> {
  updateRun(run.id, { phase: "plan", round, status: "running" });
  const res = await runAgentPhase(live(run.id), "planner", planPrompt(live(run.id)), inject);
  if (res.status !== "ok") return res.status;
  const handoff = parseAgentJson(res.output, (v) => PlanHandoffSchema.parse(v));
  saveHandoff(run.id, "plan", round, handoff, live(run.id).worktreePath);
  return "ok";
}

async function runImplement(run: Run, round: number, inject: InjectMode): Promise<"ok" | "ask" | "error"> {
  updateRun(run.id, { phase: "implement", round, status: "running" });
  const res = await runAgentPhase(live(run.id), "implementer", implementPrompt(live(run.id), round), inject);
  if (res.status !== "ok") return res.status;
  const handoff = parseAgentJson(res.output, (v) => ImplementHandoffSchema.parse(v));
  saveHandoff(run.id, "implement", round, handoff, live(run.id).worktreePath);
  return "ok";
}

async function runReview(
  run: Run,
  round: number,
  inject: InjectMode,
): Promise<{ status: "ok" | "ask" | "error"; review?: ReviewHandoff }> {
  updateRun(run.id, { phase: "review", round, status: "running" });
  const res: PhaseResult = await runAgentPhase(live(run.id), "reviewer", reviewPrompt(live(run.id), round), inject);
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
