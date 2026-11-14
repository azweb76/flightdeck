import type { AgentEvent } from "../agent/types.ts";

export type DemoScenario = "success" | "ask" | "fail-review" | "cap";

export function demoScenarioFor(issue: { key: string; title: string }): DemoScenario {
  if (/#8\b/.test(issue.key) || /dollar cap|spend cap/i.test(issue.title)) return "cap";
  if (/#21\b/.test(issue.key) || /retry|webhook/i.test(issue.title)) return "fail-review";
  if (issue.key.startsWith("PROJ") || /question|stuck|clarify/i.test(issue.title)) return "ask";
  return "success";
}

export function* planEvents(title: string): Generator<AgentEvent> {
  yield { kind: "text", title: "plan", detail: `I'll keep the plan in Flightdeck only.\n\n1. Touch the invoice export area for “${title}”.\n2. Add tests, then lint, typecheck, and build.\n3. Open a draft PR when review passes.` };
  yield { kind: "usage", title: "usage", costUsd: 0.12 };
  yield { kind: "done", title: "plan done", detail: "Plan ready." };
}

export function* askEvents(): Generator<AgentEvent> {
  yield {
    kind: "ask",
    title: "Need a decision",
    ask: {
      prompt: "Should the CSV include refunded invoices, or only paid ones?",
      options: [
        { id: "paid", label: "Paid only" },
        { id: "all", label: "Include refunds" },
      ],
    },
  };
}

export function* implementEvents(round: number, answer?: string, issue?: { key: string; title: string }): Generator<AgentEvent> {
  const extra = answer ? ` Using your answer: ${answer}.` : "";
  yield { kind: "text", title: "implement", detail: implementNotes(round, extra, issue) };
  yield { kind: "tool", title: "Bash", detail: "pnpm test && pnpm lint && pnpm typecheck && pnpm build" };
  yield { kind: "text", title: "gates", detail: "tests, lint, typecheck, and build all passed." };
  yield { kind: "usage", title: "usage", costUsd: 0.35 };
  yield { kind: "done", title: "implement done" };
}

function implementNotes(round: number, extra: string, issue?: { key: string; title: string }): string {
  const webhook = issue && (/#21\b/.test(issue.key) || /webhook/i.test(issue.title));
  if (round >= 3) {
    return webhook
      ? `Follow-up after Dan answered: still tightening retries and the 5xx-then-success test.${extra}`
      : `Follow-up after Dan answered: addressed the review notes.${extra}`;
  }
  if (webhook) {
    return round === 0
      ? `Added retry with backoff to the webhook handler.${extra}\nRunning tests, lint, typecheck, and build.`
      : `Round ${round}: still tightening retries and the 5xx-then-success test.${extra}`;
  }
  return round === 0
    ? `Added export route and a download button.${extra}\nRunning tests, lint, typecheck, and build.`
    : `Round ${round}: addressed the review notes (auth on the export route, CSV header row).${extra}`;
}

export function reviewFailNotes(issue: { key: string; title: string }, round = 1): string {
  if (/#21\b/.test(issue.key) || /webhook/i.test(issue.title)) return webhookFailNotes(round);
  if (/#15\b/.test(issue.key) || /refund/i.test(issue.title)) {
    return round <= 1
      ? "- Refunded invoices are still mixed into the paid-only CSV.\n- The refund column has no header."
      : "- The refund column has no header.";
  }
  if (/#12\b/.test(issue.key) || /csv|invoice/i.test(issue.title)) {
    return round <= 1 ? "- Export is missing auth.\n- CSV has no header row." : "- CSV has no header row.";
  }
  return "- Acceptance criteria are not all met.";
}

function webhookFailNotes(round: number): string {
  if (round <= 1) {
    return "- Handler returns 200 even when the downstream POST fails.\n- No exponential backoff or retry budget.\n- Missing a test for 5xx then success.";
  }
  if (round === 2) return "- No exponential backoff or retry budget.\n- Missing a test for 5xx then success.";
  return "- Missing a test for 5xx then success.";
}

export function* reviewEvents(
  round: number,
  pass: boolean,
  issue: { key: string; title: string } = { key: "", title: "" },
): Generator<AgentEvent> {
  if (pass) {
    yield {
      kind: "text",
      title: "review",
      detail: `${round > 3 ? "Follow-up after Dan answered" : `Review round ${round}`}: checked every acceptance criterion against the diff.\n\nAPPROVE — all acceptance criteria are met.`,
    };
  } else {
    yield {
      kind: "text",
      title: "review",
      detail: `${round > 3 ? "Follow-up after Dan answered" : `Review round ${round}`}: CHANGES_NEEDED.\n${reviewFailNotes(issue, round)}\nAcceptance criteria are not all met.`,
    };
  }
  yield { kind: "usage", title: "usage", costUsd: 0.18 };
  yield { kind: "done", title: "review done" };
}

export function* capEvents(): Generator<AgentEvent> {
  yield { kind: "text", title: "plan", detail: "Started a plan, then the spend tracker crossed the cap." };
  yield { kind: "usage", title: "usage", costUsd: 12 };
}

export function eventCost(ev: AgentEvent): number {
  return ev.costUsd ?? 0;
}
