import { MAX_CI_ROUNDS, ciRoundCaption, extraRoundLabel, type Change } from "@flightdeck/shared";
import { detectClaudeConfig, claudeSdkEnv } from "../claude/index.ts";
import { commitChecks } from "../github/checks.ts";
import { resolveGithubToken } from "../github/token.ts";
import { getSettings } from "../settings/index.ts";
import { getAgentDriver, type AgentEvent } from "../agent/index.ts";
import { applyAgentEvent, emitChange, log, setStage } from "./emit.ts";
import { ciLimit } from "./machine.ts";
import { ciFixPrompt } from "./prompts.ts";
import { currentRunEpoch, isRunCurrent } from "./jobs.ts";
import { commitAll, pushBranch, runGates } from "./worktree.ts";

export async function watchDemoCi(change: Change, answer?: string, epoch = currentRunEpoch()): Promise<void> {
  const extra = Boolean(answer) && change.ciRound >= MAX_CI_ROUNDS;
  const limit = ciLimit(change.ciRound, extra);
  const failsBeforePass = failCount(change.scenario);
  while (change.ciRound < limit || change.ciPhase === "watching" || change.ciPhase === "fixing") {
    if (!isRunCurrent(epoch)) return;
    if (change.ciPhase === "fixing") {
      await fixDemoCi(change, epoch, answer);
      change.ciPhase = "";
      emitChange(change);
      answer = undefined;
      continue;
    }
    beginWatch(change);
    const passing = change.ciRound > failsBeforePass;
    log(change, {
      kind: "system",
      title: "ci",
      detail: passing ? "All checks passed." : `CI failed on attempt ${change.ciRound}.`,
    });
    if (passing) {
      change.ciPhase = "";
      change.status = "done";
      emitChange(change);
      return;
    }
    if (change.ciRound >= limit) {
      askCi(change);
      return;
    }
    change.ciPhase = "fixing";
    emitChange(change);
    await fixDemoCi(change, epoch, answer);
    change.ciPhase = "";
    emitChange(change);
    answer = undefined;
  }
}

export async function watchLiveCi(change: Change, answer?: string): Promise<void> {
  const extra = Boolean(answer) && change.ciRound >= MAX_CI_ROUNDS;
  const limit = ciLimit(change.ciRound, extra);
  const token = await resolveGithubToken();
  if (!token?.token) {
    log(change, { kind: "system", title: "ci", detail: "No GitHub token; skipped CI watch." });
    change.status = "done";
    emitChange(change);
    return;
  }
  const [owner, name] = change.repoSlug.split("/");
  if (!owner || !name || !change.prNumber) {
    change.status = "done";
    emitChange(change);
    return;
  }
  while (change.ciRound < limit || change.ciPhase === "watching" || change.ciPhase === "fixing") {
    if (change.ciPhase === "fixing") {
      await fixLiveCi(change, "Resuming the in-flight CI fix.", answer);
      change.ciPhase = "";
      emitChange(change);
      answer = undefined;
      continue;
    }
    beginWatch(change);
    const result = await waitForChecks(token.token, owner, name, change.branch);
    log(change, { kind: "system", title: "ci", detail: result.summary });
    if (result.state === "passing") {
      change.ciPhase = "";
      change.status = "done";
      emitChange(change);
      return;
    }
    if (change.ciRound >= limit) {
      askCi(change);
      return;
    }
    change.ciPhase = "fixing";
    emitChange(change);
    await fixLiveCi(change, result.summary, answer);
    change.ciPhase = "";
    emitChange(change);
    answer = undefined;
  }
}

function beginWatch(change: Change): void {
  if (change.ciPhase === "watching") return;
  change.ciRound += 1;
  change.ciPhase = "watching";
  setStage(change, "watching_ci", "ci", "CI", ciRoundCaption(change.ciRound));
}

function failCount(scenario: string | undefined): number {
  if (scenario === "ci-ask") return MAX_CI_ROUNDS;
  if (scenario === "ci-fix") return 1;
  return 0;
}

function askCi(change: Change): void {
  change.ciPhase = "";
  change.status = "needs_dan";
  change.ask = {
    prompt: "CI still fails after 3 automatic fixes. How should I proceed?",
    options: [
      { id: "retry", label: "Try one more fix" },
      { id: "leave", label: "Leave it for me" },
    ],
  };
  log(change, {
    kind: "ask",
    title: "Need a decision",
    detail: change.ask.prompt,
    ask: change.ask,
  });
  emitChange(change);
}

async function fixDemoCi(change: Change, epoch: number, answer?: string): Promise<void> {
  if (!isRunCurrent(epoch)) return;
  setStage(change, "fixing_ci", "ci", "CI", extraRoundLabel(change.ciRound));
  log(change, {
    kind: "text",
    title: "ci fix",
    detail: answer ? `Fixing CI using: ${answer}` : "Patching the failing check in this worktree.",
  });
}

async function fixLiveCi(change: Change, summary: string, answer?: string): Promise<void> {
  setStage(change, "fixing_ci", "ci", "CI", `Fixing attempt ${change.ciRound}`);
  const settings = getSettings();
  const claude = await detectClaudeConfig();
  const env = claudeSdkEnv(claude);
  const cwd = change.worktreePath;
  await collectFix(change, ciFixPrompt(change, summary, answer), cwd, settings.model, env);
  const gates = await runGates(cwd);
  log(change, { kind: "system", title: "gates", detail: gates.detail });
  if (!gates.ok) return;
  await commitAll(cwd, `flightdeck: ${change.issueKey} CI fix ${change.ciRound}`);
  await pushBranch(cwd, change.branch);
}

async function waitForChecks(token: string, owner: string, name: string, ref: string) {
  for (let i = 0; i < 40; i += 1) {
    const result = await commitChecks(token, fetch, owner, name, ref, { fresh: true });
    if (result.state !== "pending") return result;
    if (process.env.FLIGHTDECK_RUN_FAST === "1") return result;
    await new Promise((r) => setTimeout(r, 15_000));
  }
  return { state: "failing" as const, sha: ref, summary: "Timed out waiting for CI." };
}

async function collectFix(change: Change, prompt: string, cwd: string, model: string, env: NodeJS.ProcessEnv): Promise<void> {
  const ac = new AbortController();
  try {
    for await (const ev of getAgentDriver().run({ prompt, cwd, model, env, role: "implement", abort: ac.signal })) {
      const result = applyAgentEvent(change, ev as AgentEvent);
      if (result === "cap") {
        ac.abort();
        return;
      }
      if (result !== "ok") return;
    }
  } catch (err) {
    if (ac.signal.aborted) return;
    throw err;
  }
}
