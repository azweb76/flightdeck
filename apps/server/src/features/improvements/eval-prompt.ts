import {
  SessionScoreSchema,
  parseAgentJson,
  scoreRegressed,
  type SessionScore,
  type StoredEvalCase,
} from "@flightdeck/shared";
import { collectAgentOutput } from "../agent/collect.ts";
import { sessionReviewPrompt } from "../agent/prompts.ts";

export async function evalPromptPatch(
  patch: string,
  cases: StoredEvalCase[],
  model: string,
): Promise<{ passed: boolean; detail: string }> {
  const replays = cases.filter((c) => c.kind === "prompt_replay");
  if (replays.length === 0) return { passed: false, detail: "no prompt_replay eval cases" };
  for (const c of replays) {
    const fixture = c.fixture as { input?: string; baseline?: SessionScore };
    const baseline = SessionScoreSchema.safeParse(fixture.baseline);
    if (!baseline.success) return { passed: false, detail: `${c.name}: bad baseline` };
    const collected = await collectAgentOutput({
      prompt: sessionReviewPrompt(
        "eval",
        `${fixture.input ?? ""}\n\nProposed implementer prompt patch:\n${patch}`,
      ),
      cwd: process.cwd(),
      role: "session_reviewer",
      model,
      permissionMode: "auto",
    });
    if (collected.status !== "ok") {
      return { passed: false, detail: `${c.name}: ${collected.error ?? collected.status}` };
    }
    const score = parseAgentJson(collected.text, (v) => SessionScoreSchema.parse(v));
    if (scoreRegressed(score, baseline.data)) {
      return { passed: false, detail: `${c.name}: score regressed` };
    }
  }
  return { passed: true, detail: "ok" };
}
