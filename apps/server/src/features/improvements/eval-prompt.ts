import {
  ImplementHandoffSchema,
  parseAgentJson,
  type ImplementHandoff,
  type StoredEvalCase,
} from "@flightdeck/shared";
import { collectAgentOutput } from "../agent/collect.ts";
import { implementerEvalPrompt } from "../agent/prompts.ts";

export type ImplementExpect = {
  requireTests?: boolean;
  baseline?: Pick<ImplementHandoff, "testsRun" | "remaining">;
};

/** Run the candidate implementer prompt against stored cases. No live SDK required. */
export async function evalPromptPatch(
  patch: string,
  cases: StoredEvalCase[],
  model: string,
): Promise<{ passed: boolean; detail: string }> {
  const replays = cases.filter((c) => c.kind === "prompt_replay");
  if (replays.length === 0) return { passed: false, detail: "no prompt_replay eval cases" };
  for (const c of replays) {
    const fixture = c.fixture as { input?: string; expect?: ImplementExpect };
    const collected = await collectAgentOutput({
      prompt: implementerEvalPrompt(String(fixture.input ?? ""), patch),
      cwd: process.cwd(),
      role: "implementer",
      model,
      permissionMode: "auto",
    });
    if (collected.status !== "ok") {
      return { passed: false, detail: `${c.name}: ${collected.error ?? collected.status}` };
    }
    const handoff = parseAgentJson(collected.text, (v) => ImplementHandoffSchema.parse(v));
    const check = scoreImplement(handoff, fixture.expect);
    if (!check.ok) return { passed: false, detail: `${c.name}: ${check.detail}` };
  }
  return { passed: true, detail: "ok" };
}

export function scoreImplement(
  handoff: ImplementHandoff,
  expect: ImplementExpect = {},
): { ok: boolean; detail: string } {
  if (expect.requireTests !== false && handoff.testsRun.length === 0) {
    return { ok: false, detail: "implementer did not run tests" };
  }
  const baseline = expect.baseline;
  if (baseline && handoff.testsRun.length < baseline.testsRun.length) {
    return { ok: false, detail: "fewer tests than baseline" };
  }
  if (baseline && !baseline.remaining && handoff.remaining) {
    return { ok: false, detail: "left remaining work the baseline finished" };
  }
  return { ok: true, detail: "ok" };
}
