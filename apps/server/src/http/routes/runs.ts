import { Hono } from "hono";
import { MidRunMessageSchema, StartRunSchema } from "@flightdeck/shared";
import { getDb } from "../../features/db/index.ts";
import { publish } from "../../features/events/index.ts";
import { notify } from "../../features/notify/index.ts";
import { answerQuestion } from "../../features/questions/store.ts";
import { enqueue } from "../../features/runs/start.ts";
import { runAgentPhase } from "../../features/runs/execute.ts";
import { activeRunCount, getRun, listEvents, listRuns, startRun, updateRun } from "../../features/runs/index.ts";
import { apiError } from "../errors.ts";

export function runRoutes(): Hono {
  const app = new Hono();
  app.get("/", (c) => c.json({ runs: listRuns(), active: activeRunCount() }));
  app.get("/:id", (c) => {
    const run = getRun(Number(c.req.param("id")));
    if (!run) throw apiError(404, "not_found", "Run not found");
    return c.json({ run, events: listEvents(run.id) });
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
    throw apiError(400, "start_failed", err instanceof Error ? err.message : "start failed");
  }
}

function cancel(id: number) {
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
  getDb()
    .prepare("INSERT INTO run_messages (run_id, target, text, created_at) VALUES (?,?,?,?)")
    .run(run.id, msg.target, msg.text, new Date().toISOString());
  publish("run.event", { runId: run.id, message: msg });
  return { ok: true };
}

async function answer(id: number, body: unknown) {
  const run = getRun(id);
  if (!run?.questionId) throw apiError(400, "no_question", "No open question");
  const parsed = body as { answer: string };
  answerQuestion(run.questionId, parsed.answer);
  updateRun(run.id, { status: "queued", questionId: null, pauseReason: null });
  enqueue(run.id);
  return getRun(run.id);
}

async function fix(id: number) {
  const run = getRun(id);
  if (!run) throw apiError(404, "not_found", "Run not found");
  updateRun(run.id, { phase: "fix", status: "running" });
  await runAgentPhase(getRun(run.id)!, "implementer", "Fix CI failures and PR review comments.");
  await notify("Fix finished", `Run ${run.id}`, `/runs/${run.id}`);
  return getRun(run.id);
}
