import { Hono } from "hono";
import { MidRunMessageSchema, StartRunSchema } from "@flightdeck/shared";
import { publish } from "../../features/events/index.ts";
import { notify } from "../../features/notify/index.ts";
import { answerQuestion } from "../../features/questions/store.ts";
import { enqueue } from "../../features/runs/start.ts";
import { runAgentPhase } from "../../features/runs/execute.ts";
import { abortRun } from "../../features/runs/abort.ts";
import { insertMessage } from "../../features/messages/index.ts";
import { runDiff } from "../../features/runs/diff.ts";
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
  insertMessage(run.id, msg);
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
  await runAgentPhase(getRun(run.id)!, "implementer", await buildFixPrompt(run));
  await notify("Fix finished", `Run ${run.id}`, `/runs/${run.id}`);
  return getRun(run.id);
}

async function buildFixPrompt(run: { repoSlug: string; prNumber?: number }): Promise<string> {
  const lines = ["Fix CI failures and PR review comments in this worktree."];
  if (!run.prNumber || process.env.FLIGHTDECK_DEMO === "1") return lines.join("\n");
  const [owner, name] = run.repoSlug.split("/");
  const { createGithubClient } = await import("../../features/github/index.ts");
  const gh = createGithubClient();
  lines.push("Checks:", await gh.prChecks(owner ?? "", name ?? "", run.prNumber));
  lines.push("Review comments:", await gh.prComments(owner ?? "", name ?? "", run.prNumber));
  return lines.join("\n");
}
