import { roundUsd, usageUsd, type AgentRole, type Run } from "@flightdeck/shared";
import { getAgentDriver, type AgentEvent } from "../agent/index.ts";
import { getDb } from "../db/index.ts";
import { publish } from "../events/index.ts";
import { keepAwakeStart, keepAwakeStop } from "../keep-awake/index.ts";
import { notify } from "../notify/index.ts";
import { insertQuestion, answerQuestion } from "../questions/store.ts";
import { getRepo } from "../repos/index.ts";
import { getSettings } from "../settings/index.ts";
import { insertEvent, updateRun, activeRunCount, getRun, latestSdkSessionId } from "./store.ts";
import { bindAbort, clearAbort } from "./abort.ts";
import { takeMessages, type InjectMode } from "../messages/index.ts";
import { MessageStream, userText } from "../agent/stream.ts";
import { bindStream, unbindLive, waitForAnswer } from "./live.ts";

export type PhaseResult = { status: "ok" | "ask" | "error"; output: string };

export async function runAgentPhase(
  run: Run,
  role: AgentRole,
  prompt: string,
  inject: InjectMode = "start",
): Promise<PhaseResult> {
  const sessionId = insertSession(run.id, role, run.phase, run.round);
  const notes = takeMessages(run.id, inject);
  const full = notes.length
    ? `${prompt}\n\nOperator messages:\n${notes.map((n) => `- ${n}`).join("\n")}`
    : prompt;
  const abort = bindAbort(run.id);
  const stream = new MessageStream();
  stream.push(userText(full));
  bindStream(run.id, stream);
  keepAwakeStart();
  try {
    return await consume(run, role, stream, sessionId, abort);
  } finally {
    unbindLive(run.id);
    clearAbort(run.id);
    if (activeRunCount() === 0) keepAwakeStop();
  }
}

async function consume(
  run: Run,
  role: AgentRole,
  prompt: MessageStream,
  sessionId: number,
  abort: AbortSignal,
): Promise<PhaseResult> {
  const parts: string[] = [];
  const driver = getAgentDriver();
  for await (const ev of driver.run({
    prompt,
    cwd: run.worktreePath || process.cwd(),
    role,
    model: roleModel(role, run),
    permissionMode: "auto",
    resumeSessionId: latestSdkSessionId(run.id, role),
    abort,
  })) {
    const current = getRun(run.id);
    if (abort.aborted || !current || current.status === "cancelled") {
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
    const q = insertQuestion({
      runId: run.id,
      prompt: ev.ask.prompt,
      options: ev.ask.options,
      toolUseId: ev.ask.toolUseId,
    });
    updateRun(run.id, { status: "asking", questionId: q.id, pauseReason: ev.ask.prompt });
    if (ev.sdkSessionId) {
      getDb().prepare("UPDATE sessions SET sdk_session_id = ? WHERE id = ?").run(ev.sdkSessionId, sessionId);
    }
    await notify("Flightdeck needs you", ev.ask.prompt, `/runs/${run.id}`);
    publish("questions.updated", { runId: run.id });
    record(run.id, sessionId, role, ev);
    const liveAsk = process.env.FLIGHTDECK_DEMO !== "1" && process.env.FLIGHTDECK_AGENT !== "fake";
    if (!liveAsk) return "ask";
    try {
      const answer = await waitForAnswer(run.id);
      answerQuestion(q.id, answer);
      updateRun(run.id, { status: "running", questionId: null, pauseReason: null });
      return undefined;
    } catch {
      return "error";
    }
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
    if (ev.usd != null) {
      extraUsd = roundUsd(Math.max(0, ev.usd - current.costUsd));
    } else {
      extraUsd = roundUsd(usageUsd(ev.tokensIn ?? 0, ev.tokensOut ?? 0));
    }
    const nextCost = ev.usd != null ? roundUsd(Math.max(current.costUsd, ev.usd)) : roundUsd(current.costUsd + extraUsd);
    updateRun(run.id, { costUsd: nextCost });
    if (nextCost >= run.capUsd) {
      record(run.id, sessionId, role, ev, extraUsd);
      updateRun(run.id, { status: "paused", pauseReason: `Hit $${run.capUsd} cap` });
      await notify("Dollar cap hit", `Run ${run.id} paused at the cap`, `/runs/${run.id}`);
      return "error";
    }
  }
  record(run.id, sessionId, role, ev, extraUsd);
  if (ev.kind === "done" && ev.sdkSessionId) {
    getDb().prepare("UPDATE sessions SET sdk_session_id = ? WHERE id = ?").run(ev.sdkSessionId, sessionId);
  }
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
