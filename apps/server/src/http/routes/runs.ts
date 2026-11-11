import { Hono } from "hono";
import { MidRunMessageSchema, StartRunSchema, type Run } from "@flightdeck/shared";
import { publish } from "../../features/events/index.ts";
import { enqueue } from "../../features/runs/start.ts";
import { abortRun } from "../../features/runs/abort.ts";
import { insertMessage } from "../../features/messages/index.ts";
import { answerQuestion, getQuestion, listQuestions } from "../../features/questions/store.ts";
import { hasLiveSession, pushLiveInput, resolveLiveAnswer } from "../../features/runs/live.ts";
import { runDiff } from "../../features/runs/diff.ts";
import { insertEvent } from "../../features/runs/store.ts";
import { activeRunCount, getRun, listEvents, listRuns, startRun, updateRun } from "../../features/runs/index.ts";
import { apiError } from "../errors.ts";
import { NeedRepoError } from "../../features/discovery/index.ts";

export function runRoutes(): Hono {
  const app = new Hono();
  app.get("/", (c) => c.json({ runs: listRuns(), active: activeRunCount() }));
  app.get("/:id", (c) => {
    const run = getRun(Number(c.req.param("id")));
    if (!run) throw apiError(404, "not_found", "Run not found");
    const question = listQuestions(run.id).find((q) => q.status === "open") ?? null;
    return c.json({ run, events: listEvents(run.id), question });
  });
  app.get("/:id/diff", async (c) => {
    const run = getRun(Number(c.req.param("id")));
    if (!run) throw apiError(404, "not_found", "Run not found");
    return c.json({ diff: await runDiff(run) });
  });
  app.post("/", async (c) => c.json(await create(await c.req.json()), 201));
  app.post("/:id/cancel", (c) => c.json(cancel(Number(c.req.param("id")))));
  app.post("/:id/resume", (c) => c.json(resume(Number(c.req.param("id")))));
  app.post("/:id/message", async (c) => c.json(await message(Number(c.req.param("id")), await c.req.json())));
  app.post("/:id/answer", async (c) => c.json(await answer(Number(c.req.param("id")), await c.req.json())));
  app.post("/:id/fix", async (c) => c.json(await fix(Number(c.req.param("id")))));
  return app;
}

async function create(body: unknown) {
  try {
    return await startRun(StartRunSchema.parse(body));
  } catch (err) {
    if (err instanceof NeedRepoError) throw err;
    throw apiError(400, "start_failed", err instanceof Error ? err.message : "start failed");
  }
}

function cancel(id: number) {
  abortRun(id);
  const run = updateRun(id, { status: "cancelled", finishedAt: new Date().toISOString() });
  if (!run) throw apiError(404, "not_found", "Run not found");
  publish("runs.updated");
  return run;
}

function resume(id: number) {
  const run = getRun(id);
  if (!run) throw apiError(404, "not_found", "Run not found");
  updateRun(id, { status: "queued", pauseReason: null });
  enqueue(id);
  return getRun(id);
}

async function message(id: number, body: unknown) {
  const run = getRun(id);
  if (!run) throw apiError(404, "not_found", "Run not found");
  const msg = MidRunMessageSchema.parse(body);
  recordUserBubble(run, msg.text);
  if (msg.target === "current" && hasLiveSession(run.id) && pushLiveInput(run.id, msg.text)) {
    publish("run.event", { runId: run.id, message: msg });
    return { ok: true, live: true };
  }
  insertMessage(run.id, msg);
  publish("run.event", { runId: run.id, message: msg });
  return { ok: true };
}

async function answer(id: number, body: unknown) {
  const run = getRun(id);
  if (!run?.questionId) throw apiError(400, "no_question", "No open question");
  const parsed = body as { answer: string };
  const question = getQuestion(run.questionId);
  if (resolveLiveAnswer(run.id, parsed.answer, question?.toolUseId)) {
    return getRun(run.id);
  }
  answerQuestion(run.questionId, parsed.answer);
  recordUserBubble(run, parsed.answer);
  insertMessage(run.id, { target: "current", text: `Operator answered: ${parsed.answer}` });
  updateRun(run.id, { status: "queued", questionId: null, pauseReason: null });
  enqueue(run.id);
  return getRun(run.id);
}

function recordUserBubble(run: Run, text: string): void {
  const role =
    run.phase === "plan" ? "planner" : run.phase === "review" || run.phase === "session_review" ? "reviewer" : "implementer";
  insertEvent({
    runId: run.id,
    role,
    kind: "text",
    title: "user",
    detail: text,
    at: new Date().toISOString(),
  });
}

async function fix(id: number) {
  const run = getRun(id);
  if (!run) throw apiError(404, "not_found", "Run not found");
  updateRun(run.id, { phase: "fix", status: "queued" });
  enqueue(run.id);
  return getRun(run.id);
}
