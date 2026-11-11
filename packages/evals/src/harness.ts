import { HandoffSchema } from "@flightdeck/shared";

export type EvalCase = {
  name: string;
  input: unknown;
  check: (input: unknown) => boolean;
};

export function defineEval(c: EvalCase): EvalCase {
  return c;
}

export function runEvals(cases: EvalCase[]): { passed: number; failed: string[] } {
  const failed: string[] = [];
  for (const c of cases) {
    try {
      if (!c.check(c.input)) failed.push(c.name);
    } catch (err) {
      failed.push(`${c.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { passed: cases.length - failed.length, failed };
}

export const handoffEval = defineEval({
  name: "plan-handoff-valid",
  input: { kind: "plan", summary: "Ship CSV", steps: ["write", "test"] },
  check: (input) => HandoffSchema.safeParse(input).success,
});
