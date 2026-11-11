import { HandoffSchema } from "./schemas/handoffs.ts";
import { SessionScoreSchema, type SessionScore } from "./schemas/improvements.ts";

export type StoredEvalCase = {
  name: string;
  kind: string;
  fixture: unknown;
};

export type ReplayResult = { passed: boolean; failed: string[] };

/** Replay stored eval fixtures (handoffs and session scores). Used by server apply and @flightdeck/evals. */
export function replayEvalCase(c: StoredEvalCase): { passed: boolean; detail: string } {
  if (c.kind === "handoff") {
    const ok = HandoffSchema.safeParse(c.fixture).success;
    return { passed: ok, detail: ok ? "handoff ok" : "handoff invalid" };
  }
  if (c.kind === "session_replay") {
    const score = (c.fixture as { score?: unknown } | undefined)?.score ?? c.fixture;
    const ok = SessionScoreSchema.safeParse(score).success;
    return { passed: ok, detail: ok ? "score ok" : "score invalid" };
  }
  if (c.kind === "prompt_edit") {
    return { passed: false, detail: "prompt_edit must be replayed through a driver" };
  }
  if (c.kind === "prompt_replay") {
    const fixture = c.fixture as { baseline?: unknown };
    const ok = SessionScoreSchema.safeParse(fixture.baseline).success;
    return { passed: ok, detail: ok ? "baseline ok" : "baseline invalid" };
  }
  return { passed: false, detail: `unknown kind ${c.kind}` };
}

/** True when the candidate is worse than the baseline on any scored dimension. */
export function scoreRegressed(candidate: SessionScore, baseline: SessionScore): boolean {
  return (
    candidate.waste > baseline.waste ||
    candidate.backtracking > baseline.backtracking ||
    candidate.stuck > baseline.stuck ||
    candidate.missingContext > baseline.missingContext ||
    candidate.prQuality < baseline.prQuality
  );
}

export function replayEvalCases(cases: StoredEvalCase[]): ReplayResult {
  const failed: string[] = [];
  for (const c of cases) {
    const r = replayEvalCase(c);
    if (!r.passed) failed.push(`${c.name}: ${r.detail}`);
  }
  return { passed: failed.length === 0, failed };
}
