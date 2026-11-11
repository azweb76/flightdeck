import { roundUsd, usageUsd, type AgentRole, type Run } from "@flightdeck/shared";
import { getAgentDriver, type AgentEvent } from "../agent/index.ts";
import { getDb } from "../db/index.ts";
import { publish } from "../events/index.ts";
import { keepAwakeStart, keepAwakeStop } from "../keep-awake/index.ts";
import { notify } from "../notify/index.ts";
import { insertQuestion } from "../questions/store.ts";
import { getRepo } from "../repos/index.ts";
import { getSettings } from "../settings/index.ts";
import { insertEvent, updateRun, activeRunCount, getRun } from "./store.ts";

export type PhaseResult = { status: "ok" | "ask" | "error"; output: string };

export async function runAgentPhase(
  run: Run,
  role: AgentRole,
  prompt: string,
): Promise<PhaseResult> {
  const sessionId = insertSession(run.id, role, run.phase, run.round);
  keepAwakeStart();
  try {
    return await consume(run, role, prompt, sessionId);
  } finally {
    if (activeRunCount() === 0) keepAwakeStop();
  }
}

async function consume(
  run: Run,
  role: AgentRole,
  prompt: string,
  sessionId: number,
): Promise<PhaseResult> {
  const parts: string[] = [];
  const driver = getAgentDriver();
  for await (const ev of driver.run({
    prompt,
    cwd: run.worktreePath || process.cwd(),
    role,
    model: roleModel(role, run),
    permissionMode: "auto",
  })) {
    const current = getRun(run.id);
    if (!current || current.status === "cancelled") {
      return { status: "error", output: parts.join("\n") };
    }
    if (ev.kind === "text" && ev.detail) parts.push(ev.detail);
    if (ev.kind === "done" && ev.detail) parts.push(ev.detail);
    const hit = await handleEvent(run, current, role, sessionId, ev);
    if (hit) return { status: hit, output: parts.join("\n") };
  }
  return { status: "ok", output: parts.join("\n") };
}

async function handleEvent(
  run: Run,
  current: Run,
  role: AgentRole,
  sessionId: number,
  ev: AgentEvent,
): Promise<"ask" | "error" | undefined> {
  if (ev.kind === "ask" && ev.ask) {
    const q = insertQuestion({ runId: run.id, prompt: ev.ask.prompt, options: ev.ask.options });
    updateRun(run.id, { status: "asking", questionId: q.id, pauseReason: ev.ask.prompt });
    await notify("Flightdeck needs you", ev.ask.prompt, `/runs/${run.id}`);
    publish("questions.updated", { runId: run.id });
    record(run.id, sessionId, role, ev);
    return "ask";
  }
  if (ev.kind === "error") {
    record(run.id, sessionId, role, ev);
    updateRun(run.id, { status: "paused", pauseReason: ev.detail ?? ev.title });
    await notify("Run paused", ev.detail ?? ev.title, `/runs/${run.id}`);
    return "error";
  }
  return handleUsage(run, current, role, sessionId, ev);
}

async function handleUsage(
  run: Run,
  current: Run,
  role: AgentRole,
  sessionId: number,
  ev: AgentEvent,
): Promise<"error" | undefined> {
  let extraUsd = 0;
  if (ev.kind === "usage") {
    extraUsd = roundUsd(usageUsd(ev.tokensIn ?? 0, ev.tokensOut ?? 0));
    const nextCost = roundUsd(current.costUsd + extraUsd);
    updateRun(run.id, { costUsd: nextCost });
    if (nextCost >= run.capUsd) {
      record(run.id, sessionId, role, ev, extraUsd);
      updateRun(run.id, { status: "paused", pauseReason: `Hit $${run.capUsd} cap` });
      await notify("Dollar cap hit", `Run ${run.id} paused at the cap`, `/runs/${run.id}`);
      return "error";
    }
  }
  record(run.id, sessionId, role, ev, extraUsd);
  return undefined;
}

function record(runId: number, sessionId: number, role: AgentRole, ev: AgentEvent, usd?: number): void {
  const kind = ev.kind === "ask" || ev.kind === "done" ? "system" : ev.kind;
  insertEvent({
    runId,
    sessionId,
    role,
    kind,
    title: ev.title,
    detail: ev.detail ?? "",
    tool: ev.tool,
    path: ev.path,
    tokensIn: ev.tokensIn,
    tokensOut: ev.tokensOut,
    usd,
    at: new Date().toISOString(),
  });
  publish("run.event", { runId });
}

function insertSession(runId: number, role: AgentRole, phase: string, round: number): number {
  const r = getDb()
    .prepare(
      `INSERT INTO sessions (run_id, role, phase, round, status, created_at) VALUES (?,?,?,?,?,?)`,
    )
    .run(runId, role, phase, round, "running", new Date().toISOString());
  return Number(r.lastInsertRowid);
}

export function roleModel(role: AgentRole, run?: Run): string {
  const repo = run ? getRepo(run.repoId) : undefined;
  if (repo?.modelOverride) return repo.modelOverride;
  const s = getSettings();
  if (role === "refiner") return s.modelRefiner;
  if (role === "planner") return s.modelPlanner;
  if (role === "reviewer" || role === "session_reviewer") return s.modelReviewer;
  return s.modelImplementer;
}
