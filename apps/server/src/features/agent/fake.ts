import type { AgentDriver, AgentEvent, AgentRunOpts } from "./types.ts";

type FakeOpts = { ask?: boolean; fail?: boolean; majorFirst?: boolean };

/** Deterministic driver for tests, demo, and Linux CI. Emits Zod-shaped JSON. */
export function createFakeDriver(opts: FakeOpts = {}): AgentDriver {
  let reviews = 0;
  return {
    async *run(req: AgentRunOpts): AsyncIterable<AgentEvent> {
      yield { kind: "text", title: `${req.role} started`, detail: req.prompt.slice(0, 240) };
      yield { kind: "tool", title: "Read", tool: "Read", path: "CLAUDE.md" };
      if (opts.ask) {
        yield askEvent();
        return;
      }
      if (opts.fail) {
        yield { kind: "error", title: "Tool failed", detail: "simulated tool error" };
        return;
      }
      if (req.role === "reviewer") reviews += 1;
      yield jsonEvent(payload(req, reviews, opts.majorFirst === true));
      yield { kind: "usage", title: "usage", tokensIn: 1200, tokensOut: 400 };
      yield { kind: "done", title: `${req.role} finished` };
    },
  };
}

function jsonEvent(obj: unknown): AgentEvent {
  return { kind: "text", title: "assistant", detail: `\`\`\`json\n${JSON.stringify(obj)}\n\`\`\`` };
}

function askEvent(): AgentEvent {
  return {
    kind: "ask",
    title: "Need a decision",
    ask: {
      prompt: "Should the new endpoints go under /v2?",
      options: [
        { id: "yes", label: "Yes, /v2" },
        { id: "no", label: "No, keep current paths" },
      ],
    },
  };
}

function payload(req: AgentRunOpts, reviews: number, majorFirst: boolean): unknown {
  if (req.role === "refiner") return refinePayload(req.prompt);
  if (req.role === "planner") {
    return { kind: "plan", summary: "Ship the change", steps: ["Implement", "Add tests"], files: [] };
  }
  if (req.role === "implementer") {
    return {
      kind: "implement",
      summary: "Updated the worktree",
      filesChanged: ["src/index.ts"],
      testsRun: ["pnpm test"],
      remaining: "",
    };
  }
  if (req.role === "reviewer") return reviewPayload(reviews, majorFirst);
  return {
    kind: "session_score",
    waste: 3,
    backtracking: 1,
    prQuality: 8,
    stuck: 2,
    missingContext: 4,
    notes: "Synthetic session review",
  };
}

function refinePayload(prompt: string): unknown {
  if (prompt.includes("kind\":\"refine_goal") || prompt.includes("Write the goal") || prompt.includes("Write a goal")) {
    return {
      kind: "refine_goal",
      markdown: "## Goal\nShip the requested change.\n\n## Acceptance criteria\n- Behavior matches the answers\n\n## Constraints\n- Follow CLAUDE.md",
    };
  }
  return {
    kind: "refine_questions",
    questions: [
      {
        id: "scope",
        prompt: "What is in scope for this change?",
        options: [
          { id: "minimal", label: "Smallest change that meets the issue" },
          { id: "full", label: "Full production-ready behavior" },
        ],
        allowOther: true,
      },
      {
        id: "compat",
        prompt: "How should we treat existing callers?",
        options: [
          { id: "compat", label: "Keep backward compatibility" },
          { id: "break", label: "A breaking change is OK" },
        ],
        allowOther: true,
      },
    ],
  };
}

function reviewPayload(reviews: number, majorFirst: boolean): unknown {
  if (majorFirst && reviews === 1) {
    return {
      kind: "review",
      passed: false,
      findings: [{ severity: "major", title: "Missing tests", detail: "No 429 coverage" }],
      notes: "",
    };
  }
  if (!majorFirst && reviews === 1) {
    return {
      kind: "review",
      passed: false,
      findings: [{ severity: "minor", title: "Polish", detail: "Tighten names" }],
      notes: "",
    };
  }
  return { kind: "review", passed: true, findings: [], notes: "Looks good" };
}
